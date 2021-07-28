import QuerySegment from './query-segment.js';

describe('#constructor', () => {
    it('throws when a non-null, non-undefined, non-string segment is specified.', () => {
        let badValues = [123, true, new Date()];
        for (let v of badValues) {
            expect(() => new QuerySegment(v)).toThrow(/segment.+string/i);
        }
    });
    it('sets the initial segment value.', () => {
        let qs = new QuerySegment('SELECT * FROM');
        expect(qs.segment).toBe('SELECT * FROM');
        expect(qs.params.size).toBe(0);
    });
    it('sets params map from another map.', () => {
        let qs = new QuerySegment(null, new Map([['a', 1], ['b', 2], ['c', 3]]));
        expect(qs.params.size).toBe(3);
        expect(qs.params.get('a')).toBe(1);
        expect(qs.params.get('b')).toBe(2);
        expect(qs.params.get('c')).toBe(3);
    });
    it('sets params map from an array matrix.', () => {
        let qs = new QuerySegment(null, [['a', 1], ['b', 2], ['c', 3]]);
        expect(qs.params.size).toBe(3);
        expect(qs.params.get('a')).toBe(1);
        expect(qs.params.get('b')).toBe(2);
        expect(qs.params.get('c')).toBe(3);
    });
});

describe('#concat', () => {
    it('throws when the parameter has already been added or already exists.', () => {
        let qs = new QuerySegment('SELECT * FROM Contacts WHERE FirstName LIKE @w0');
        qs.params.set('@w0', 'John');
        expect(() => qs.concat(new QuerySegment(null, [['@w0', 'Bob']]))).toThrow(/collision/i);
        expect(() => qs.concat(new QuerySegment(null, [['@w1', 'Yoda']]))).not.toThrow();
        expect(() => qs.concat(new QuerySegment(null, [['@w1', 'Froddo']]))).toThrow(/collision/i);
    });
    it('combines the segments and params from other QuerySegments.', () => {
        let qs = new QuerySegment();
        qs.concat(new QuerySegment('SELECT'), new QuerySegment(' * FROM'));
        qs.concat(new QuerySegment(' WHERE FirstName LIKE @w0 AND LastName = @w1 AND Abc = @w2', new Map([
            ['@w0', 1],
            ['@w1', 2],
            ['@w2', 3]
        ])));
        expect(qs.segment).toBe('SELECT * FROM WHERE FirstName LIKE @w0 AND LastName = @w1 AND Abc = @w2');
        expect(qs.params.size).toBe(3);
        expect(qs.params.get('@w0')).toBe(1);
        expect(qs.params.get('@w1')).toBe(2);
        expect(qs.params.get('@w2')).toBe(3);
    });
    it('combines the segments and params from strings.', () => {
        let qs = new QuerySegment();
        qs.concat('SELECT * ', 'FROM Moose');
        qs.concat(' WHERE FirstName LIKE \'Bob\'');
        expect(qs.segment).toBe('SELECT * FROM Moose WHERE FirstName LIKE \'Bob\'');
        expect(qs.params.size).toBe(0);
    });
    it('combines the segments and params from strings and segments, skipping nulls.', () => {
        let qs = new QuerySegment();
        qs.concat('SELECT * ', null, 'FROM Moose', new QuerySegment(' WHERE FirstName LIKE @w0 AND LastName = @w1 AND Abc = @w2', new Map([
            ['@w0', 1],
            ['@w1', 2],
            ['@w2', 3]
        ])), null);
        expect(qs.segment).toBe('SELECT * FROM Moose WHERE FirstName LIKE @w0 AND LastName = @w1 AND Abc = @w2');
        expect(qs.params.size).toBe(3);
        expect(qs.params.get('@w0')).toBe(1);
        expect(qs.params.get('@w1')).toBe(2);
        expect(qs.params.get('@w2')).toBe(3);
    });
    it('reinitializes the params map if needed.', () => {
        let qs = new QuerySegment();
        qs.params = null;
        qs.concat('SELECT * ', 'FROM Moose');
        expect(qs.params).toBeInstanceOf(Map);
    });
});