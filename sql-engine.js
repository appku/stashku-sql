import StashKu, {
    GetRequest,
    PostRequest,
    PutRequest,
    PatchRequest,
    DeleteRequest,
    OptionsRequest,
    BaseEngine,
    Filter,
    Response,
    RESTError,
    ModelGenerator,
    ModelUtility
} from '@appku/stashku';
import rhino from 'rhino';
import { SQLServerTypes, PostgresTypes } from './sql-types.js';
import QuerySegment from './query-segment.js';
import SQLTranslator from './sql-translator.js';
import fs from 'fs';
import path from 'path';

const __dirname = (
    process.platform === 'win32' ?
        path.dirname(decodeURI(new URL(import.meta.url).pathname)).substring(1) :
        path.dirname(decodeURI(new URL(import.meta.url).pathname))
);
const SUPPORTED_DRIVERS = ['sql-server'];
const OPTIONS_QUERY = fs.readFileSync(__dirname + '/templates/options.sql', 'utf8');
const RESOURCES_QUERY = fs.readFileSync(__dirname + '/templates/resources.sql', 'utf8');

/**
 * @typedef SQLStorageAuthenticationConfiguration
 * @property {String} type
 * @property {String} user
 * @property {String} password
 * @property {String} domain
 */

/**
 * @typedef SQLStoragePoolConfiguration
 * @property {Number} min
 * @property {Number} max
 */

/**
 * @typedef SQLStorageLogConfiguration
 * @property {Boolean} queries
 * @property {Boolean} sensitive
 */

/**
 * @typedef SQLStorageBatchConfiguration
 * @property {Boolean} [enabled=false]
 * @property {Number} [size=100]
 */

/**
 * @typedef SQLBulkColumnOptions
 * @property {Boolean} [nullable=false] - Indicates whether the column accepts NULL values.
 * @property {Number} length - For VarChar, NVarChar, VarBinary. Use length as Infinity for VarChar(max), NVarChar(max) and VarBinary(max).
 * @property {Number} precision - For Numeric, Decimal.
 * @property {Number} scale - For Numeric, Decimal, Time, DateTime2, DateTimeOffset.
 */

/**
 * @typedef SQLStorageConfigurationModel
 * @property {Boolean} [views=false]
 */

/**
 * @typedef SQLStorageConfiguration
 * @property {String} driver
 * @property {String} host
 * @property {Number} port
 * @property {String} database
 * @property {SQLStorageAuthenticationConfiguration} auth
 * @property {SQLStorageBatchConfiguration} batch
 * @property {SQLStoragePoolConfiguration} pool
 * @property {SQLStorageLogConfiguration} log
 * @property {Boolean} encrypt
 * @property {SQLStorageConfigurationModel} [model]
 */

/**
 * Helper function to process input values to a boolean.
 * @param {String} input - Input value to check for `true` or `false`.
 * @returns {Boolean}
 */
const toBool = (input) => !!(input === 1 || input === true || (typeof input === 'string' && input.match(/^[ty1]/i)));

/**
 * This StashKu engine provides an interface to SQL databases and support for all StashKu RESTful actions and
 * operations. 
 */
class SQLEngine extends BaseEngine {
    /**
     * Creates a new `SQLEngine` instance.
     */
    constructor() {
        super('sql');

        /**
         * @type {SQLStorageConfiguration}
         */
        this.config = super.config;

        /**
         * The driver instance for the configured database.
         */
        this.driver = null;
    }

    /**
     * @inheritdoc
     */
    async destroy() {
        if (this.driver) {
            return new Promise((res, rej) => {
                this.driver.destroy(() => {
                    res();
                });
            });
        }
    }

    /**
     * @inheritdoc
     * @param {*} config - The configuration object for the storage engine.
     */
    configure(config, log) {
        super.configure(config, log);
        this.config = Object.assign({
            driver: process.env.STASHKU_SQL_DRIVER || 'sql-server',
            host: process.env.STASHKU_SQL_HOST || 'localhost',
            database: process.env.STASHKU_SQL_DATABASE || 'master',
            port: process.env.STASHKU_SQL_PORT || 1433,
            encrypt: toBool(process.env.STASHKU_SQL_ENCRYPT),
            trust: toBool(process.env.STASHKU_SQL_TRUST),
            auth: {}
        }, config);
        this.config.batch = Object.assign({
            enabled: toBool(process.env.STASHKU_SQL_BATCH_ENABLED),
            size: process.env.STASHKU_SQL_BATCH_SIZE || 100
        }, config ? config.batch : null);
        this.config.log = Object.assign({
            queries: toBool(process.env.STASHKU_SQL_LOG_QUERIES),
            sensitive: toBool(process.env.STASHKU_SQL_LOG_SENSITIVE)
        }, config ? config.log : null);
        this.driver = null; //clear out the driver instance to allow re-initialization
        //initialize the database driver
        let driverConfig = {
            server: this.config.host,
            authentication: {
                type: 'default',
                options: {}
            },
            options: {
                database: this.config.database,
                port: parseInt(this.config.port),
                encrypt: !!this.config.encrypt,
                trustServerCertificate: !!this.config.trust,
                useColumnNames: true,
                enableArithAbort: true
            }
        };
        if (this.config) {
            //we only want these properties set if they are present
            if (process.env.STASHKU_SQL_AUTH_TYPE || this.config.auth.type) {
                this.config.auth.type =
                    driverConfig.authentication.type =
                    this.config.auth.type || process.env.STASHKU_SQL_AUTH_TYPE;
            }
            if (process.env.STASHKU_SQL_AUTH_USER || this.config.auth.user) {
                this.config.auth.user =
                    driverConfig.authentication.options.userName =
                    this.config.auth.user || process.env.STASHKU_SQL_AUTH_USER;
            }
            if (process.env.STASHKU_SQL_AUTH_PASSWORD || this.config.auth.password) {
                this.config.auth.password =
                    driverConfig.authentication.options.password =
                    this.config.auth.password || process.env.STASHKU_SQL_AUTH_PASSWORD;
            }
            if (process.env.STASHKU_SQL_AUTH_DOMAIN || this.config.auth.domain) {
                this.config.auth.domain =
                    driverConfig.authentication.options.domain =
                    this.config.auth.domain || process.env.STASHKU_SQL_AUTH_DOMAIN;
            }
            //merge other options
            if (this.config.options) {
                driverConfig.options = Object.assign(driverConfig.options, this.config.options);
            }
        }
        this.driver = new rhino(driverConfig);
    }

    /**
     * @inheritdoc
     * @returns {Promise.<Array.<String>>}
     */
    async resources() {
        let names = await this.raw(RESOURCES_QUERY);
        return names.map(v => `${SQLTranslator.identifier(v.schema)}.${SQLTranslator.identifier(v.name)}`);
    }

    /**
     * Makes a raw SQL query to the configured database.
     * @param {String} query - The SQL query to run on the database.
     * @param {Object|Map} [params] - The URI parameters to include in the request.
     * @returns {Promise.<Array>}
     */
    async raw(query, params) {
        if (query) {
            if (this.log && this.config.log && this.config.log.queries) {
                this.log.debug('Executing SQL query.', query, this.config.log.sensitive ? params : '{ Params Hidden }');
            }
            if (this.config.driver === 'sql-server') {
                let result = await this.driver.query(query, params);
                if (Array.isArray(result)) {
                    return result.map(v => v.rows);
                }
                return result.rows;
            }
        }
        throw new RESTError(500, 'The "query" parameter argument is missing or not defined.');
    }

    /**
     * Bulk-loads rows into the database using specified column definitions.
     * @param {String} tableName - The name of the table to bulk-load into.
     * @param {Map.<String, SQLBulkColumnOptions>} columns - An map of column definitions with the key as the column name.
     * @param {Array} rows - An array of rows to bulk-load.
     * @param {{checkConstraints:Boolean, fireTriggers:Boolean, keepNulls:Boolean, tableLock:Boolean}} [options] - Optional bulk-load options for the underlying driver.
     * @returns {Promise.<Number>}
     */
    async bulk(tableName, columns, rows, options) {
        if (!tableName) {
            throw new RESTError(500, 'The "tableName" argument is required.');
        }
        if (columns && columns.size && rows) {
            if (this.log && this.config.log && this.config.log.queries) {
                this.log.debug('Executing SQL bulk-load.', columns);
            }
            if (this.config.driver === 'sql-server') {
                let bk = await this.driver.bulk(tableName, Object.assign({
                    checkConstraints: false,
                    fireTriggers: false,
                    keepNulls: false,
                    tableLock: false
                }, options));
                for (let [k, v] of columns) {
                    let opts = Object.assign({
                        nullable: true
                    }, v);
                    await bk.column(k, rhino.Types[v.type], opts);
                }
                for (let i = 0, ilen = rows.length; i < ilen; i++) {
                    await bk.add(rows[i]);
                }
                let rowCount = await bk.execute();
                return rowCount;
            }
        }
        throw new RESTError(500, 'Invalid bulk operation. No columns or rows were specified.');
    }

    /**
     * @inheritdoc
     * @param {GetRequest} request - The GET request to send to the storage engine.
     * @returns {Promise.<Response>} Returns the data objects from storage matching request criteria.
     */
    async get(request) {
        //validate
        await super.get(request);
        let meta = request.metadata;
        let headers = meta.headers ?? new Map();
        if (meta.bulk || headers.get('bulk')) {
            throw new RESTError(400, 'A "get" request does not support bulk operations (only "post" requests do).');
        } else if (meta.batch) {
            throw new RESTError(400, 'A "get" request does not support batch operations (only "put" and "post" requests do).');
        }
        //build the query
        let qs = new QuerySegment();
        try {
            let totalSegment = null;
            let baseSegment = new QuerySegment('SELECT');
            if (meta.distinct) {
                baseSegment.line(1, 'DISTINCT');
            }
            if (meta.properties && meta.properties.length && meta.properties[0] !== '*') {
                baseSegment.line(1, SQLTranslator.columns(...meta.properties));
            } else {
                baseSegment.line(1, '*');
            }
            baseSegment.line(1, `FROM ${SQLTranslator.identifier(meta.from)}`);
            if (meta.where && Filter.isEmpty(meta.where) === false) {
                baseSegment.line(1, 'WHERE ', SQLTranslator.where(meta.where));
            }
            //if paging is enabled we need to build a primary totalling query to get the non-paged total.
            if (meta.skip || meta.take) {
                totalSegment = new QuerySegment('WITH base AS (');
                totalSegment.line(1, baseSegment);
                totalSegment.line(0, ')');
                totalSegment.line(0, 'SELECT COUNT(*) AS __Query_Total FROM base;\n\n');
                totalSegment.params.clear(); //remove parameters (they already exist on the base)
            }
            //continue building the base query segment
            if (meta.sorts && meta.sorts.length) {
                baseSegment.line(1, 'ORDER BY ', SQLTranslator.sorts(...meta.sorts));
            } else if (meta.skip || meta.take) {
                baseSegment.line(1, 'ORDER BY 1');
            }
            if (meta.skip) {
                baseSegment.line(1, `OFFSET ${SQLTranslator.integer(meta.skip)} ROWS`);
            }
            if (meta.take) {
                if (!meta.skip) {
                    baseSegment.line(1, 'OFFSET 0 ROWS'); //always include offset
                }
                baseSegment.line(1, `FETCH NEXT ${SQLTranslator.integer(meta.take)} ROWS ONLY`);
            }
            //handle count-only requests
            if (meta.count) {
                baseSegment.prepend('SELECT COUNT(*) AS __Query_Returns FROM (\n');
                baseSegment.line(0, ') as query');
            }
            //combine queries
            qs.concat(totalSegment, baseSegment);
        } catch (err) {
            throw new RESTError(500, `Failed to generate query.\nError: ${err}`);
        }
        //make the query
        let results = await this.raw(qs.segment, qs.params);
        //respond
        if (meta.count) {
            if (meta.skip || meta.take) {
                return new Response(null, results[0][0].__Query_Total, 0, results[1][0].__Query_Returns);
            } else {
                return new Response(null, results[0].__Query_Returns, 0, results[0].__Query_Returns);
            }
        } else {
            if (meta.skip || meta.take) {
                return new Response(results[1], results[0][0].__Query_Total, 0, results[1].length);
            } else {
                return new Response(results, results.length, 0, results.length);
            }
        }
    }

    /**
     * @inheritdoc
     * @param {PostRequest} request - The POST request to send to the storage engine.
     * @returns {Promise.<Response>} Returns the data objects from storage matching request criteria.
     */
    async post(request) {
        //validate
        await super.post(request);
        let meta = request.metadata;
        let headers = meta.headers ?? new Map();
        let res = new Response();
        let batch = !!(meta.batch || this.config.batch.enabled || headers.get('batch'));
        let batchSize = (this.config?.batch?.size || headers.get('batch')?.size || 100);
        //build the query
        if (meta.bulk || headers.get('bulk')) {
            let columns = new Map(Object.entries(meta.bulk ?? headers.get('bulk')));
            //validate columns
            for (let [c, v] of columns) {
                if (!v.type) {
                    throw new RESTError(400, `The "request" bulk metadata is missing the required 'type' for column "${c}".`);
                } else if (typeof SQLServerTypes[v.type] === 'undefined') {
                    throw new RESTError(400, `The "request" bulk metadata contains an invalid or unsupported column type "${v.type}".`);
                }
            }
            if (batch) {
                for (let x = 0; x < meta.objects.length; x += batchSize) {
                    let rows = meta.objects.slice(x, x + batchSize);
                    if (rows.length) {
                        res.total += await this.bulk(meta.to, columns, rows);
                    }
                }
            } else {
                res.total = await this.bulk(meta.to, columns, meta.objects);
            }
            res.affected = res.total;
        } else {
            let chunk = '';
            let counter = 0;
            if (batch) {
                chunk = `ALTER TABLE ${SQLTranslator.identifier(meta.to)} NOCHECK CONSTRAINT ALL;`;
            }
            for (let o of meta.objects) {
                let qs = new QuerySegment('INSERT INTO ');
                try {
                    qs.concat(SQLTranslator.identifier(meta.to), '(');
                    qs.line(2, SQLTranslator.columns(...Object.keys(o)));
                    qs.line(1, ') ', meta.count ? '' : 'OUTPUT INSERTED.*');
                    qs.line(1, 'VALUES (');
                    qs.line(2, SQLTranslator.values(o));
                    qs.line(1, ')');
                } catch (err) {
                    throw new RESTError(500, `Failed to generate query.\nError: ${err}`);
                }
                if (batch) { //batching enabled, build up a batch query.
                    chunk += SQLTranslator.raw(qs) + ';\n';
                    counter++;
                    if (counter >= batchSize) {
                        //batch exec
                        let results = await this.raw(chunk);
                        res.data.push(...results.flat());
                        res.total += results.length;
                        //reset chunk
                        chunk = '';
                        counter = 0;
                    }
                } else {
                    //non-batch exec
                    let results = await this.raw(qs.segment, qs.params);
                    if (!meta.count) {
                        res.data.push(results[0]);
                    }
                    res.total++;
                }
            }
            //handle batch left-overs
            if (batch && counter > 0) {
                let results = await this.raw(chunk);
                res.data.push(...results.flat());
                res.total += results.length;
            }
            res.affected = res.total;
            res.returned = res.total;
        }
        //respond
        return res;
    }

    /**
     * @inheritdoc
     * @param {PutRequest} request - The PUT request to send to the storage engine.
     * @returns {Promise.<Response>} Returns the data objects from storage matching request criteria.
     */
    async put(request) {
        //validate
        await super.put(request);
        if (request.metadata.bulk) {
            throw new RESTError(400, 'A "put" request does not support bulk operations (only "post" requests do).');
        }
        let meta = request.metadata;
        let headers = meta.headers ?? new Map();
        let res = new Response();
        //build the query
        let batch = !!(meta.batch || this.config.batch.enabled || headers.get('batch'));
        let batchSize = (this.config?.batch?.size || headers.get('batch')?.size || 100);
        let chunk = '';
        let counter = 0;
        for (let o of meta.objects) {
            let qs = new QuerySegment('UPDATE ');
            let f = new Filter();
            for (let k of meta.pk) {
                f.and(k, Filter.OP.EQUALS, o[k]);
            }
            try {
                qs.concat(SQLTranslator.identifier(meta.to), ' SET ');
                qs.line(1, SQLTranslator.columnValues(o, null, meta.pk));
                if (!meta.count) {
                    qs.line(1, 'OUTPUT INSERTED.*');
                }
                qs.line(1, 'WHERE ', SQLTranslator.where(f));
            } catch (err) {
                throw new RESTError(500, `Failed to generate query.\nError: ${err}`);
            }
            if (batch) { //batching enabled, build up a batch query.
                chunk += SQLTranslator.raw(qs) + ';\n';
                counter++;
                if (counter >= batchSize) {
                    //batch exec
                    let results = await this.raw(chunk);
                    res.data.push(...results.flat());
                    res.total += results.length;
                    //reset chunk
                    chunk = '';
                    counter = 0;
                }
            } else {
                //non-batch exec
                let results = await this.raw(qs.segment, qs.params);
                res.data.push(results[0]);
                res.total++;
            }
        }
        //handle batch left-overs
        if (batch && counter > 0) {
            let results = await this.raw(chunk);
            res.data.push(...results.flat());
            res.total += results.length;
        }
        //respond
        res.affected = res.total;
        res.returned = res.total;
        return res;
    }

    /**
     * @inheritdoc
     * @param {PatchRequest} request - The PUT request to send to the storage engine.
     * @returns {Promise.<Response>} Returns the data objects from storage matching request criteria.
     */
    async patch(request) {
        //validate
        await super.patch(request);
        if (request.metadata.bulk) {
            throw new RESTError(400, 'A "patch" request does not support bulk operations (only "post" requests do).');
        } else if (request.metadata.batch) {
            throw new RESTError(400, 'A "patch" request does not support batch operations (only "put" and "post" requests do).');
        }
        let meta = request.metadata;
        let res = new Response();
        //build the query
        let emptyFilter = Filter.isEmpty(meta.where);
        if (meta.all === true || emptyFilter === false) { //must have either a filter, or the "all" flag set.
            let qs = new QuerySegment('UPDATE ');
            try {
                qs.concat(SQLTranslator.identifier(meta.to), ' SET ');
                qs.line(1, SQLTranslator.columnValues(meta.template));
                if (!meta.count) {
                    qs.line(1, 'OUTPUT INSERTED.*');
                }
                if (meta.where && Filter.isEmpty(meta.where) === false) {
                    qs.line(1, 'WHERE ', SQLTranslator.where(meta.where));
                }
            } catch (err) {
                throw new RESTError(500, `Failed to generate query.\nError: ${err}`);
            }
            let results = await this.raw(qs.segment, qs.params);
            res.data.push(...results);
            res.total = results.length;
        }
        //respond        
        res.affected = res.total;
        res.returned = res.total;
        return res;
    }

    /**
     * @inheritdoc
     * @param {DeleteRequest} request - The PUT request to send to the storage engine.
     * @returns {Promise.<Response>} Returns the data objects from storage matching request criteria.
     */
    async delete(request) {
        //validate
        await super.delete(request);
        if (request.metadata.bulk) {
            throw new RESTError(400, 'A "delete" request does not support bulk operations (only "post" requests do).');
        } else if (request.metadata.batch) {
            throw new RESTError(400, 'A "delete" request does not support batch operations (only "put" and "post" requests do).');
        }
        let meta = request.metadata;
        let res = new Response();
        //build the query
        let emptyFilter = Filter.isEmpty(meta.where);
        if (meta.all === true || emptyFilter === false) { //must have either a filter, or the "all" flag set.
            let qs = new QuerySegment('DELETE FROM ');
            try {
                qs.concat(SQLTranslator.identifier(meta.from));
                if (!meta.count) {
                    qs.line(1, 'OUTPUT DELETED.*');
                }
                if (meta.where && Filter.isEmpty(meta.where) === false) {
                    qs.line(1, 'WHERE ', SQLTranslator.where(meta.where));
                }
            } catch (err) {
                throw new RESTError(500, `Failed to generate query.\nError: ${err}`);
            }
            let results = await this.raw(qs.segment, qs.params);
            res.data.push(...results);
            res.total = results.length;
        }
        //respond
        res.affected = res.total;
        res.returned = res.total;
        return res;
    }

    /**
     * @inheritdoc
     * @override
     * @throws 404 Error when the requested resource is has not been stored in memory.
     * @param {OptionsRequest} request - The OPTIONS request to send to the storage engine.
     * @returns {Promise.<Response>} Returns a response with a single data object- the dynamically created model configuration.
     */
    async options(request) {
        //validate
        await super.options(request);
        //get information
        let meta = request.metadata;
        let data = [];
        let resources = [];
        if (meta.from === '*') {
            resources.push(...(await this.resources()));
        } else {
            resources.push(meta.from);
        }
        let includeViews = (process.env.STASHKU_SQL_MODEL_VIEWS === 'true');
        let includeTables = this.config?.model?.tables ?? true;
        if (this.config?.model?.views === true) {
            includeViews = true;
        }
        if (typeof this.config?.model?.tables === 'undefined' && process.env.STASHKU_SQL_MODEL_TABLES === 'false') {
            includeTables = false;
        }
        for (let resource of resources) {
            let properties = new Map();
            let columns = await this.raw(OPTIONS_QUERY, {
                resource: resource,
                views: includeViews,
                tables: includeTables
            });
            if (columns && columns.length) {
                for (let col of columns) {
                    if (properties.has(col.property) === false) {
                        let def = {
                            target: col.property,
                            type: SQLTranslator.toJSTypeName(col.dataType)
                        };
                        if (col.keyed) {
                            def.pk = true;
                        }
                        if (col.numberPrecision) {
                            def.precision = col.numberPrecision;
                        }
                        if (col.numberRadix) {
                            def.radix = col.numberRadix;
                        }
                        if (col.charLength) {
                            def.charLength = col.charLength;
                        }
                        if (col.keyed || col.hasDefault) {
                            //omit if null to let SQL handle the default
                            def.omit = {
                                post: null,
                                put: null
                            };
                        }
                        if (!def.pk && !col.nullable && !col.hasDefault) {
                            switch (def.type) {
                                case 'Number': def.default = 0; break;
                                case 'String': def.default = ''; break;
                                case 'Boolean': def.default = false; break;
                                case 'Array': def.default = []; break;
                                case 'Date': def.default = new Date(); break;
                                case 'Map': def.default = new Map(); break;
                                case 'Set': def.default = new Set(); break;
                                case 'Buffer': def.default = Buffer.alloc(0); break;
                                case 'ArrayBuffer': def.default = new ArrayBuffer(0); break;
                            }
                        }
                        properties.set(ModelGenerator.formatPropName(col.property), def);
                    }
                }
            } else if (meta.from !== '*') {
                throw new RESTError(404, `The requested resource "${resource}" was not found.`);
            } else {
                continue;
            }
            //generate model type and return
            let mt = ModelGenerator.generateModelType(resource, properties, { resource: resource });
            data.push(mt);
        }
        return new Response(data, data.length, 0, data.length);
    }

}

export {
    SQLEngine as default,
    SQLServerTypes,
    PostgresTypes
};