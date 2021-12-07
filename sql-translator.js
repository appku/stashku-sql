import { Filter, Sort } from '@appku/stashku';
import QuerySegment from './query-segment.js';
import ParamTokenizer from './param-tokenizer.js';

// eslint-disable-next-line no-control-regex
const EscapeRegex = new RegExp(/[\0\x08\x09\x1a\n\r"'\\%]/g);
const EscapeChar = function escaper(char) {
    var m = ['\0', '\x08', '\x09', '\x1a', '\n', '\r', '\'', '"', '\\', '%'];
    var r = ['\\0', '\\b', '\\t', '\\z', '\\n', '\\r', '\'\'', '""', '\\\\', '\\%'];
    return r[m.indexOf(char)];
};
// const DateRegex = new RegExp(/^[A-z]{3} [A-z]{3} [0-9]{1,2} [0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2} .+\(.+\)$/g);

export default class SQLTranslator {

    /**
     * Always returns an integer representing the best parsed value from the given argument, even if the type is not 
     * a number. If the value is not parsable the return value will be 0.
     * @param {*} value - The value that should be an integer.
     * @returns {Number}
     */
    static integer(value) {
        let v = parseInt(value);
        if (value === true) {
            return 1;
        } else if (isNaN(v)) {
            return 0;
        }
        return v;
    }

    /**
     * Convert a parameterized query (`QuerySegment`) into a raw SQL query string (escaped).
     * @param {QuerySegment} segment - The segment to convert.
     * @returns {String}
     */
    static raw(segment) {
        if (segment) {
            let query = segment.segment;
            for (let [k, v] of segment.params) {
                query = query.replace(k, SQLTranslator.escape(v));
            }
            return query;
        }
        return null;
    }

    /**
     * Converts a value into a SQL (raw) string representation.
     * @throws Error when the value type is not supported.
     * @param {*} value - The value to be converted into the SQL (raw) equivalent.
     * @param {String} driver - The StashKu-SQL driver name, to be used for situations of differing dialects.
     * @returns {String}
     */
    static escape(value, driver) {
        let ptype = typeof value;
        let pstr = null;
        let stringify = false;
        if (ptype === 'undefined' || value === null) {
            pstr = 'NULL';
        } else if (typeof value.toSqlString === 'function') {
            pstr = value.toSqlString();
        } else if (ptype === 'boolean') {
            pstr = (value ? '1' : '0');
        } else if (ptype === 'string') {
            pstr = value.toString();
            stringify = true;
        } else if (ptype === 'number') {
            if (isNaN(value) || isFinite(value) === false) {
                pstr = 'NULL';
            } else {
                pstr = parseFloat(value).toString();
            }
        } else if (Buffer.isBuffer(value)) {
            pstr = `0x${value.toString('hex').toUpperCase()}`;
        } else if (value instanceof Date) {
            pstr = value.toISOString();
            stringify = true;
        } else if (Array.isArray(value)) {
            pstr = '(';
            for (let i = 0; i < value.length; i++) {
                pstr += SQLTranslator.escape(value[i]) + (i + 1 < value.length ? ', ' : '');
            }
            pstr += ')';
        }
        if (pstr === null) {
            throw new Error('Unable to escape value. Unknown or unsupported type.');
        }
        if (stringify) {
            //need to escape/wrap a string value
            pstr = `'${pstr.replace(EscapeRegex, EscapeChar)}'`;
        }
        return pstr;
    }

    /**
     * Validates and returns a SQL-escaped identifier from a property or field name value.
     * @see {@link https://docs.microsoft.com/en-us/sql/relational-databases/databases/database-identifiers|MSDN Database Identifiers}
     * @throws Error if the `name` argument is missing.
     * @throws Error if the specified `name` value contains invalid/unsupported characters for SQL identifiers.
     * @throws Error if the first character of the `name` value is not a valid unicode letter or allowed special character ("_", "@", ""#"").
     * @param {String} name - a raw field name.
     * @returns {String} 
     */
    static identifier(name) {
        if (!name) {
            throw new Error('The "name" argument is missing or empty and is required.');
        } else if (name.match(/^[^\p{L}A-z_#]/gu)) {
            throw new Error('Invalid "name" argument. The first character is not a valid unicode letter or allowed special character ("_", "@", ""#"").');
        } else if (name.match(/[^\p{L}A-z0-9_$@# .]/gu)) {
            throw new Error('Invalid "name" argument. The specified `field` value contains invalid/unsupported characters for SQL column names.');
        }
        return `[${name.split('.').join('].[')}]`;
    }

    /**
     * Translates a spread of identifiers, or optionally a dictionary-like object or Map, into an escaped listing of
     * column names.
     * 
     * @example
     * let seg = SQLTranslator.columns('n.First Name', 'alias.Middle', 'n.Last Name');
     * console.log(seg.segment);
     * //"[n].[First Name], [alias].[Middle], [n].[Last Name]"
     * @param {...String} names - The column names to validate and escape. A dictionary-like object or Map may also be
     * provided as a single argument.
     * @returns {QuerySegment}
     */
    static columns(...names) {
        let qs = new QuerySegment();
        let keys = names;
        //check first argument
        if (names.length) {
            if (typeof names[0] === 'object') {
                if (names[0] instanceof Map) {
                    keys = names[0].keys();
                } else {
                    keys = Object.keys(names[0]);
                }
            }
        }
        for (let n of keys) {
            if (qs.segment) {
                qs.segment += ', ';
            }
            qs.segment += SQLTranslator.identifier(n);
        }
        return qs;
    }

    /**
     * Translates dictionary-like object or `Map` listing of column (property) names and values to a SQL-compatible 
     * column and value listing typically used in `UPDATE` statements.
     * 
     * @example
     * let seg = SQLTranslator.values({
     *     FirstName: 'John',
     *     "n.LastName": 'Martin'
     * });
     * console.log(seg.segment);
     * //"[First Name] = ＠v0, [n].[LastName] = ＠v1"
     * 
     * @param {Map.<String, *>|Object} dictionary - A dictionary or object of column names and values to translate.
     * @param {ParamTokenizer} [tokenizer] - The parameter tokenizer used to generate parameter value identifiers.
     * @param {Array.<String>} [exclusions] - Array of columns to ignore/exclude from the generated query segment.
     * @returns {QuerySegment}
     */
    static values(dictionary, tokenizer, exclusions) {
        let qs = new QuerySegment();
        if (!tokenizer) {
            tokenizer = new ParamTokenizer('val');
        }
        if (dictionary) {
            let keys = null;
            let isMap = (dictionary instanceof Map);
            if (isMap) {
                keys = dictionary.keys();
            } else {
                keys = Object.keys(dictionary);
            }
            //remove exclusions
            if (exclusions) {
                keys = keys.filter(v => exclusions.indexOf(v) < 0); //only get keys NOT in exclusions
            }
            //generate
            for (let col of keys) {
                if (qs.segment) {
                    qs.segment += ', ';
                }
                let token = tokenizer.token();
                qs.segment += token;
                if (isMap) {
                    qs.params.set(token, dictionary.get(col));
                } else {
                    qs.params.set(token, dictionary[col]);
                }
            }
        }
        return qs;
    }

    /**
     * Translates dictionary-like object or `Map` listing of column (property) names and values to a SQL-compatible 
     * column and value listing typically used in `UPDATE` statements.
     * 
     * @example
     * let seg = SQLTranslator.values({
     *     FirstName: 'John',
     *     "n.LastName": 'Martin'
     * });
     * console.log(seg.segment);
     * //"[First Name] = ＠v0, [n].[LastName] = ＠v1"
     * 
     * @param {Map.<String, *>|Object} dictionary - A dictionary or object of column names and values to translate.
     * @param {ParamTokenizer} [tokenizer] - The parameter tokenizer used to generate parameter value identifiers.
     * @param {Array.<String>} [exclusions] - Array of columns to ignore/exclude from the generated query segment.
     * @returns {QuerySegment}
     */
    static columnValues(dictionary, tokenizer, exclusions) {
        let qs = new QuerySegment();
        if (!tokenizer) {
            tokenizer = new ParamTokenizer('val');
        }
        if (dictionary) {
            let keys = null;
            let isMap = (dictionary instanceof Map);
            if (isMap) {
                keys = dictionary.keys();
            } else {
                keys = Object.keys(dictionary);
            }
            //remove exclusions
            if (exclusions) {
                keys = keys.filter(v => exclusions.indexOf(v) < 0); //only get keys NOT in exclusions
            }
            //generate
            for (let col of keys) {
                if (qs.segment) {
                    qs.segment += ', ';
                }
                let token = tokenizer.token();
                qs.segment += SQLTranslator.identifier(col);
                qs.segment += ` = ${token}`;
                if (isMap) {
                    qs.params.set(token, dictionary.get(col));
                } else {
                    qs.params.set(token, dictionary[col]);
                }
            }
        }
        return qs;
    }

    /**
     * Translates sorts into a sort listing SQL query segment.
     * 
     * @example
     * let seg = SQLTranslator.sorts(
     *     new Sort('FirstName'),
     *     new Sort('LastName', Sort.DIR.DESC)
     * );
     * console.log(seg.segment);
     * //"[FirstName], [LastName] DESC"
     * 
     * @param  {...Sort} sorts - The `Sort` instances to translate.
     * @returns {QuerySegment}
     */
    static sorts(...sorts) {
        let qs = new QuerySegment();
        for (let s of sorts) {
            if (qs.segment) {
                qs.segment += ', ';
            }
            qs.segment += SQLTranslator.identifier(s.property);
            if (s.dir === Sort.DIR.DESC) {
                qs.segment += ' DESC';
            }
        }
        return qs;
    }

    /**
     * Translates a "where" StashKu Request metadata component to a SQL-compatible condition query segment.
     * @param {Filter} filter - A "where" query filter instance. 
     * @param {ParamTokenizer} [tokenizer] - The parameter tokenizer used to generate parameter value identifiers.
     * @returns {QuerySegment}
     */
    static where(filter, tokenizer) {
        if (filter.tree) {
            return SQLTranslator.where(filter.tree);
        } else {
            if (!tokenizer) {
                tokenizer = new ParamTokenizer('w');
            }
            if (filter.logic) {
                let qs = new QuerySegment();
                if (filter.filters) {
                    let group = false;
                    for (let x = 0; x < filter.filters.length; x++) {
                        let childSegment = SQLTranslator.where(filter.filters[x], tokenizer);
                        if (childSegment && childSegment.segment) {
                            if (!qs.segment) {
                                qs.segment += '('; //only start a group if something is found
                                group = true;
                            }
                            //prefix logic after first item has been added
                            if (x > 0) {
                                qs.segment += ` ${filter.logic.toUpperCase()} `;
                            }
                            //add the segment and params
                            qs.segment += childSegment.segment;
                            childSegment.params.forEach((v, k) => qs.params.set(k, v));
                        }
                    }
                    if (group) {
                        qs.segment += ')';
                    }
                }
                return qs;
            } else if (filter.property && filter.op) {
                let col = SQLTranslator.identifier(filter.property);
                let param = null;
                if (filter.op !== Filter.OP.ISNULL
                    && filter.op !== Filter.OP.ISNOTNULL
                    && filter.op !== Filter.OP.ISEMPTY
                    && filter.op !== Filter.OP.ISNOTEMPTY
                ) {
                    param = tokenizer.token();
                }
                switch (filter.op) {
                    case Filter.OP.ISNULL:
                        return new QuerySegment(`${col} IS NULL`);
                    case Filter.OP.ISNOTNULL:
                        return new QuerySegment(`${col} IS NOT NULL`);
                    case Filter.OP.EQUALS:
                        return new QuerySegment(`${col} = ${param}`, [[param, filter.value]]);
                    case Filter.OP.NOTEQUALS:
                        return new QuerySegment(`${col} != ${param}`, [[param, filter.value]]);
                    case Filter.OP.LESSTHAN:
                        return new QuerySegment(`${col} < ${param}`, [[param, filter.value]]);
                    case Filter.OP.LESSTHANOREQUAL:
                        return new QuerySegment(`${col} <= ${param}`, [[param, filter.value]]);
                    case Filter.OP.GREATERTHAN:
                        return new QuerySegment(`${col} > ${param}`, [[param, filter.value]]);
                    case Filter.OP.GREATERTHANOREQUAL:
                        return new QuerySegment(`${col} >= ${param}`, [[param, filter.value]]);
                    case Filter.OP.STARTSWITH:
                        return new QuerySegment(`${col} LIKE ${param} + '%'`, [[param, filter.value]]);
                    case Filter.OP.ENDSWITH:
                        return new QuerySegment(`${col} LIKE '%' + ${param}`, [[param, filter.value]]);
                    case Filter.OP.CONTAINS:
                        return new QuerySegment(`${col} LIKE '%' + ${param} + '%'`, [[param, filter.value]]);
                    case Filter.OP.DOESNOTCONTAIN:
                        return new QuerySegment(`${col} NOT LIKE '%' + ${param} + '%'`, [[param, filter.value]]);
                    case Filter.OP.ISEMPTY:
                        return new QuerySegment(`${col} IS NULL OR LTRIM(RTRIM(${col})) = ''`);
                    case Filter.OP.ISNOTEMPTY:
                        return new QuerySegment(`${col} IS NOT NULL AND LTRIM(RTRIM(${col})) != ''`);
                    case Filter.OP.IN:
                        if (Array.isArray(filter.value) && filter.value.length) {
                            let paramsArray = [param, ...tokenizer.tokens(filter.value.length - 1)];
                            let qs = new QuerySegment(`${col} IN (${paramsArray.join(', ')})`);
                            for (let x = 0; x < paramsArray.length; x++) {
                                qs.params.set(paramsArray[x], filter.value[x]);
                            }
                            return qs;
                        }
                        return null;
                    case Filter.OP.NOTIN:
                        if (Array.isArray(filter.value) && filter.value.length) {
                            let paramsArray = [param, ...tokenizer.tokens(filter.value.length - 1)];
                            let qs = new QuerySegment(`${col} IN (${paramsArray.join(', ')})`);
                            for (let x = 0; x < paramsArray.length; x++) {
                                qs.params.set(paramsArray[x], filter.value[x]);
                            }
                            return qs;
                        }
                        return null;
                    default:
                        throw new Error(`The filter operation "${filter.op}" is unknown or not supported.`);
                }
            }
        }
    }

}