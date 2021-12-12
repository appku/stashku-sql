import SQLTranslator from './sql-translator.js';
import { Filter, Sort } from '@appku/stashku';
import QuerySegment from './query-segment.js';
import ParamTokenizer from './param-tokenizer.js';

describe('.integer', () => {
    it('returns 0 when the value is not a number.', () => {
        expect(SQLTranslator.integer(new Date())).toBe(0);
        expect(SQLTranslator.integer(null)).toBe(0);
        expect(SQLTranslator.integer(undefined)).toBe(0);
        expect(SQLTranslator.integer(() => { })).toBe(0);
    });
    it('returns an integer equivalent of a boolean.', () => {
        expect(SQLTranslator.integer(false)).toBe(0);
        expect(SQLTranslator.integer(true)).toBe(1);
    });
    it('returns an integer equivalent of a floating point number.', () => {
        expect(SQLTranslator.integer(1234.345468)).toBe(1234);
        expect(SQLTranslator.integer(2.488)).toBe(2);
    });
    it('returns an integer equivalent of a string.', () => {
        expect(SQLTranslator.integer('1234')).toBe(1234);
        expect(SQLTranslator.integer('1.89')).toBe(1);
    });
});

describe('.toJSTypeName', () => {
    it('returns "Boolean" for numeric types.', () => {
        expect(SQLTranslator.toJSTypeName('bit')).toBe('Boolean');
    });
    it('returns "Number" for numeric types.', () => {
        [
            'tinyint', 'smallint', 'int',
            'integer', 'numeric', 'decimal',
            'smallmoney', 'float', 'real',
            'money'
        ].forEach(v => expect(SQLTranslator.toJSTypeName(v)).toBe('Number'));
    });
    it('returns "Date" for numeric types.', () => {
        [
            'smalldatetime', 'datetime', 'datetime2',
            'datetimeoffset', 'date', 'time'
        ].forEach(v => expect(SQLTranslator.toJSTypeName(v)).toBe('Date'));
    });
    it('returns "Buffer" for numeric types.', () => {
        [
            'binary', 'image', 'varbinary',
            'udt'
        ].forEach(v => expect(SQLTranslator.toJSTypeName(v)).toBe('Buffer'));
    });
    it('returns "String" for numeric types.', () => {
        [
            'bigint', 'nchar', 'char',
            'nvarchar', 'varchar', 'ntext',
            'text', 'uniqueidentifier', 'xml'
        ].forEach(v => expect(SQLTranslator.toJSTypeName(v)).toBe('String'));
    });
    it('throws an Error on unknown type name.', () => {
        [
            'squiggles', null, 34323, new Date()
        ].forEach(v => expect(() => SQLTranslator.toJSTypeName(v)).toThrow());
    });
});

describe('.raw', () => {
    it('returns null when the query segment is null or undefined.', () => {
        expect(SQLTranslator.raw()).toBeNull();
        expect(SQLTranslator.raw(null)).toBeNull();
    });
    it('returns the same segment string when no parameters are specified.', () => {
        expect(SQLTranslator.raw(new QuerySegment('INSERT 1, 2, 3;'))).toBe('INSERT 1, 2, 3;');
    });
    it('returns the raw query with parameters replaced.', () => {
        let qs = new QuerySegment('INSERT @p1, @p2, @p3;');
        qs.params.set('@p1', 123);
        qs.params.set('@p2', 'chris\'s \tcomputer\r\n');
        qs.params.set('@p3', true);
        expect(SQLTranslator.raw(qs)).toBe('INSERT 123, \'chris\'\'s \\tcomputer\\r\\n\', 1;');
    });
});

describe('.escape', () => {
    it('throws an error when the value type is not supported.', () => {
        expect(() => SQLTranslator.escape({})).toThrow(/unsupported/gi);
    });
    it('escapes a null or undefined value to null.', () => {
        expect(SQLTranslator.escape()).toBe('NULL');
        expect(SQLTranslator.escape(null)).toBe('NULL');
    });
    it('escapes a number value.', () => {
        expect(SQLTranslator.escape(123)).toBe('123');
        expect(SQLTranslator.escape(123.52)).toBe('123.52');
        expect(SQLTranslator.escape(-10)).toBe('-10');
        expect(SQLTranslator.escape(0.0000)).toBe('0');
        expect(SQLTranslator.escape(-123.52)).toBe('-123.52');
        expect(SQLTranslator.escape(NaN)).toBe('NULL');
        expect(SQLTranslator.escape(Infinity)).toBe('NULL');
    });
    it('escapes a boolean.', () => {
        expect(SQLTranslator.escape(true)).toBe('1');
        expect(SQLTranslator.escape(false)).toBe('0');
    });
    it('escapes a date.', () => {
        let dt = new Date();
        expect(SQLTranslator.escape(dt)).toBe(`'${dt.toISOString()}'`);
    });
    it('escapes a buffer.', () => {
        expect(SQLTranslator.escape(Buffer.from('hello-world', 'utf8'))).toBe('0x68656C6C6F2D776F726C64');
    });
    it('escapes a string.', () => {
        expect(SQLTranslator.escape('')).toBe('\'\'');
        expect(SQLTranslator.escape('hello world!')).toBe('\'hello world!\'');
        expect(SQLTranslator.escape('it\'s the best ever!')).toBe('\'it\'\'s the best ever!\'');
        expect(SQLTranslator.escape('abc    \t123\r\n chris\'s tools')).toBe('\'abc    \\t123\\r\\n chris\'\'s tools\'');
    });
    it('escapes an array into a list', () => {
        expect(SQLTranslator.escape(['a', 'b', 'c'])).toBe('(\'a\', \'b\', \'c\')');
        expect(SQLTranslator.escape([1, 2, 3])).toBe('(1, 2, 3)');
    });
    it('uses a custom object toSqlString function.', () => {
        let x = {};
        x.toSqlString = () => 'my_custom_Raw_Value';
        expect(SQLTranslator.escape(x)).toBe('my_custom_Raw_Value');
    });
});

describe('.identifier', () => {
    it('throws when the "name" argument is falsey.', () => {
        expect(() => SQLTranslator.identifier()).toThrow(/required/i);
    });
    it('throws when the "name" argument starts with an invalid character.', () => {
        expect(() => SQLTranslator.identifier('%ok')).toThrow(/first.+character/i);
        expect(() => SQLTranslator.identifier('*things')).toThrow(/first.+character/i);
        expect(() => SQLTranslator.identifier('--ok!1')).toThrow(/first.+character/i);
        expect(() => SQLTranslator.identifier('@absolute')).toThrow(/first.+character/i);
    });
    it('throws when the "name" argument contains an invalid character.', () => {
        expect(() => SQLTranslator.identifier('Yes%ok')).toThrow(/contains.+character/i);
        expect(() => SQLTranslator.identifier('OK*things')).toThrow(/contains.+character/i);
        expect(() => SQLTranslator.identifier('Col--ok!1')).toThrow(/contains.+character/i);
    });
    it('parses a single segment resource identifier.', () => {
        expect(SQLTranslator.identifier('This is a Column')).toBe('[This is a Column]');
        expect(SQLTranslator.identifier('#SoiSThis')).toBe('[#SoiSThis]');
        expect(SQLTranslator.identifier('äßvalid')).toBe('[äßvalid]');
        expect(SQLTranslator.identifier('_data')).toBe('[_data]');
        expect(SQLTranslator.identifier('#####')).toBe('[#####]');
    });
    it('parses a multi-segment resource identifier.', () => {
        expect(SQLTranslator.identifier('Look.At.This is a Column')).toBe('[Look].[At].[This is a Column]');
        expect(SQLTranslator.identifier('#t.dbo.#SoiSThis')).toBe('[#t].[dbo].[#SoiSThis]');
        expect(SQLTranslator.identifier('ä.resource.äßvalid')).toBe('[ä].[resource].[äßvalid]');
        expect(SQLTranslator.identifier('___.####._data')).toBe('[___].[####].[_data]');
        expect(SQLTranslator.identifier('Z.äß.###')).toBe('[Z].[äß].[###]');
    });
});

describe('.columns', () => {
    it('translates column names to a column listing segment.', () => {
        let seg = SQLTranslator.columns('dbo.FirstName', 'Middle_Name', 'e.lastName');
        expect(seg).toBeInstanceOf(QuerySegment);
        expect(seg.segment).toBe('[dbo].[FirstName], [Middle_Name], [e].[lastName]');
        expect(seg.params.size).toBe(0);
    });
    it('translates a dictionary-like object to a column listing segment.', () => {
        let seg = SQLTranslator.columns({
            FirstName: 'John',
            'middle name': 'R',
            'n.LastName': 'Doe'
        });
        expect(seg).toBeInstanceOf(QuerySegment);
        expect(seg.segment).toBe('[FirstName], [middle name], [n].[LastName]');
        expect(seg.params.size).toBe(0);
    });
    it('translates a map to a column listing segment.', () => {
        let seg = SQLTranslator.columns(new Map([
            ['FirstName', 'John'],
            ['middle name', 'R'],
            ['n.LastName', 'Doe']
        ]));
        expect(seg).toBeInstanceOf(QuerySegment);
        expect(seg.segment).toBe('[FirstName], [middle name], [n].[LastName]');
        expect(seg.params.size).toBe(0);
    });
    it('produces an empty segment when no names are provided', () => {
        expect(SQLTranslator.columns().segment).toBe('');
        expect(SQLTranslator.columns().params.size).toBe(0);
        expect(SQLTranslator.columns(new Map()).segment).toBe('');
        expect(SQLTranslator.columns(new Map()).params.size).toBe(0);
        expect(SQLTranslator.columns({}).segment).toBe('');
        expect(SQLTranslator.columns({}).params.size).toBe(0);
    });
});

describe('.values', () => {
    it('translates a dictionary-like object to a column + value segment.', () => {
        let seg = SQLTranslator.values({
            FirstName: 'John',
            'middle name': 'R',
            'n.LastName': 'Doe'
        });
        expect(seg).toBeInstanceOf(QuerySegment);
        expect(seg.segment).toBe('@val0, @val1, @val2');
        expect(seg.params.size).toBe(3);
        expect(seg.params.get('@val0')).toBe('John');
        expect(seg.params.get('@val1')).toBe('R');
        expect(seg.params.get('@val2')).toBe('Doe');
    });
    it('translates a map to a column + value segment.', () => {
        let seg = SQLTranslator.values(new Map([
            ['FirstName', 'John'],
            ['middle name', 'R'],
            ['n.LastName', 'Doe']
        ]));
        expect(seg).toBeInstanceOf(QuerySegment);
        expect(seg.segment).toBe('@val0, @val1, @val2');
        expect(seg.params.size).toBe(3);
        expect(seg.params.get('@val0')).toBe('John');
        expect(seg.params.get('@val1')).toBe('R');
        expect(seg.params.get('@val2')).toBe('Doe');
    });
    it('uses a provided tokenizer.', () => {
        let t = new ParamTokenizer('z');
        t.counter = 512;
        let seg = SQLTranslator.values({ a: 1, b: 2, c: 3 }, t);
        expect(seg).toBeInstanceOf(QuerySegment);
        expect(seg.segment).toBe('@z512, @z513, @z514');
        expect(seg.params.size).toBe(3);
        expect(seg.params.get('@z512')).toBe(1);
        expect(seg.params.get('@z513')).toBe(2);
        expect(seg.params.get('@z514')).toBe(3);
    });
    it('excludes specified columns.', () => {
        let seg = SQLTranslator.values({
            FirstName: 'John',
            'middle name': 'R',
            'n.LastName': 'Doe'
        }, null, ['middle name']);
        expect(seg).toBeInstanceOf(QuerySegment);
        expect(seg.segment).toBe('@val0, @val1');
        expect(seg.params.size).toBe(2);
        expect(seg.params.get('@val0')).toBe('John');
        expect(seg.params.get('@val1')).toBe('Doe');
    });
    it('produces an empty segment when no names are provided', () => {
        expect(SQLTranslator.columns().segment).toBe('');
        expect(SQLTranslator.columns().params.size).toBe(0);
        expect(SQLTranslator.columns(new Map()).segment).toBe('');
        expect(SQLTranslator.columns(new Map()).params.size).toBe(0);
    });
});

describe('.columnValues', () => {
    it('translates a dictionary-like object to a column + value segment.', () => {
        let seg = SQLTranslator.columnValues({
            FirstName: 'John',
            'middle name': 'R',
            'n.LastName': 'Doe'
        });
        expect(seg).toBeInstanceOf(QuerySegment);
        expect(seg.segment).toBe('[FirstName] = @val0, [middle name] = @val1, [n].[LastName] = @val2');
        expect(seg.params.size).toBe(3);
        expect(seg.params.get('@val0')).toBe('John');
        expect(seg.params.get('@val1')).toBe('R');
        expect(seg.params.get('@val2')).toBe('Doe');
    });
    it('translates a map to a column + value segment.', () => {
        let seg = SQLTranslator.columnValues(new Map([
            ['FirstName', 'John'],
            ['middle name', 'R'],
            ['n.LastName', 'Doe']
        ]));
        expect(seg).toBeInstanceOf(QuerySegment);
        expect(seg.segment).toBe('[FirstName] = @val0, [middle name] = @val1, [n].[LastName] = @val2');
        expect(seg.params.size).toBe(3);
        expect(seg.params.get('@val0')).toBe('John');
        expect(seg.params.get('@val1')).toBe('R');
        expect(seg.params.get('@val2')).toBe('Doe');
    });
    it('uses a provided tokenizer.', () => {
        let t = new ParamTokenizer('z');
        t.counter = 512;
        let seg = SQLTranslator.columnValues({ a: 1, b: 2, c: 3 }, t);
        expect(seg).toBeInstanceOf(QuerySegment);
        expect(seg.segment).toBe('[a] = @z512, [b] = @z513, [c] = @z514');
        expect(seg.params.size).toBe(3);
        expect(seg.params.get('@z512')).toBe(1);
        expect(seg.params.get('@z513')).toBe(2);
        expect(seg.params.get('@z514')).toBe(3);
    });
    it('excludes specified columns.', () => {
        let seg = SQLTranslator.columnValues({
            FirstName: 'John',
            'middle name': 'R',
            'n.LastName': 'Doe'
        }, null, ['middle name']);
        expect(seg).toBeInstanceOf(QuerySegment);
        expect(seg.segment).toBe('[FirstName] = @val0, [n].[LastName] = @val1');
        expect(seg.params.size).toBe(2);
        expect(seg.params.get('@val0')).toBe('John');
        expect(seg.params.get('@val1')).toBe('Doe');
    });
});

describe('.sorts', () => {
    it('translates multiple sorts.', () => {
        let qs = SQLTranslator.sorts(
            new Sort('FirstName'),
            new Sort('LastName', Sort.DIR.DESC),
            new Sort('Middle', Sort.DIR.ASC)
        );
        expect(qs.segment).toBe('[FirstName], [LastName] DESC, [Middle]');
    });
});

describe('.where', () => {
    it('throws on an unsupported filter operation.', () => {
        let f = Object.assign({}, Filter.and('AAA', Filter.OP.EQUALS, 123));
        f.tree.filters[0].op = 'bogus';
        expect(() => SQLTranslator.where(f)).toThrow(/not supported/i);
    });
    it('translates to empty segment on null or non-array "IN" or "NOTIN" conditions.', () => {
        //single filter
        let values = [null, undefined, 123, true, new Date()];
        for (let v of values) {
            for (let op of [Filter.OP.IN, Filter.OP.NOTIN]) {
                let seg = SQLTranslator.where(Filter.and('AAA', op, v));
                expect(seg.segment).toBe('');
                expect(seg.params.size).toBe(0);
            }
        }
    });
    it('ignores null or non-array "IN" or "NOTIN" conditions when present with other filters.', () => {
        //single filter
        let values = [null, undefined, 123, true, new Date()];
        for (let v of values) {
            for (let op of [Filter.OP.IN, Filter.OP.NOTIN]) {
                let seg = SQLTranslator.where(Filter
                    .and('Hello', Filter.OP.EQUALS, 'world')
                    .and('AAA', op, v)
                );
                expect(seg.segment).toBe('([Hello] = @w0)');
                expect(seg.params.size).toBe(1);
            }
        }
    });
    it('translates a filter.', () => {
        let f = Filter
            .and('AAA', Filter.OP.EQUALS, 'abc')
            .and('ZZZ', Filter.OP.NOTEQUALS, 'qqq')
            .or('FirstName', Filter.OP.STARTSWITH, 'john')
            .or('LastName', Filter.OP.ENDSWITH, 'jones')
            .or('MiddleName', Filter.OP.CONTAINS, 'R')
            .or('MiddleName', Filter.OP.DOESNOTCONTAIN, 'Z')
            .or('Price', Filter.OP.GREATERTHAN, 23.2313)
            .or('Price', Filter.OP.LESSTHAN, 99.559)
            .or('Cost', Filter.OP.GREATERTHANOREQUAL, 1)
            .or('Cost', Filter.OP.LESSTHANOREQUAL, 22.5)
            .and('DateDeleted', Filter.OP.ISNULL)
            .and('DateCreated', Filter.OP.ISNOTNULL)
            .and(Filter
                .or('FishTank', Filter.OP.ISEMPTY)
                .or('SharkPool', Filter.OP.ISNOTEMPTY)
                .or('Letter', Filter.OP.IN, ['a', 'b', 'c'])
                .or('Number', Filter.OP.NOTIN, [1, 2, 3, 4])
            );
        let segment = SQLTranslator.where(f);
        expect(segment).not.toBe(null);
        expect(segment.segment).toBe('((([AAA] = @w0 AND [ZZZ] != @w1) OR [FirstName] LIKE @w2 + \'%\' OR [LastName] LIKE \'%\' + @w3 OR [MiddleName] LIKE \'%\' + @w4 + \'%\' OR [MiddleName] NOT LIKE \'%\' + @w5 + \'%\' OR [Price] > @w6 OR [Price] < @w7 OR [Cost] >= @w8 OR [Cost] <= @w9) AND [DateDeleted] IS NULL AND [DateCreated] IS NOT NULL AND ([FishTank] IS NULL OR LTRIM(RTRIM([FishTank])) = \'\' OR [SharkPool] IS NOT NULL AND LTRIM(RTRIM([SharkPool])) != \'\' OR [Letter] IN (@w10, @w11, @w12) OR [Number] IN (@w13, @w14, @w15, @w16)))');
        expect(segment.params.get('@w0')).toBe('abc');
        expect(segment.params.get('@w1')).toBe('qqq');
        expect(segment.params.get('@w2')).toBe('john');
        expect(segment.params.get('@w3')).toBe('jones');
        expect(segment.params.get('@w4')).toBe('R');
        expect(segment.params.get('@w5')).toBe('Z');
        expect(segment.params.get('@w6')).toBe(23.2313);
        expect(segment.params.get('@w7')).toBe(99.559);
        expect(segment.params.get('@w8')).toBe(1);
        expect(segment.params.get('@w9')).toBe(22.5);
        expect(segment.params.get('@w10')).toBe('a');
        expect(segment.params.get('@w11')).toBe('b');
        expect(segment.params.get('@w12')).toBe('c');
        expect(segment.params.get('@w13')).toBe(1);
        expect(segment.params.get('@w14')).toBe(2);
        expect(segment.params.get('@w15')).toBe(3);
        expect(segment.params.get('@w16')).toBe(4);
    });
});