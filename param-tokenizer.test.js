import ParamTokenizer from './param-tokenizer.js';

describe('#constructor', () => {
    it('sets the default parameter prefix to "p".', () => {
        expect(new ParamTokenizer().prefix).toBe('p');
    });
    it('sets the starting count to 0.', () => {
        expect(new ParamTokenizer().counter).toBe(0);
    });
});

describe('#token', () => {
    it('Generates a sequence of tokens.', () => {
        let pt = new ParamTokenizer();
        for (let x = 0; x < 100; x++) {
            expect(pt.token()).toBe(`@p${x}`);
        }
    });
});

describe('#tokens', () => {
    it('throws when requesting a new token after the maximum of 2100 has been reached.', () => {
        let pt = new ParamTokenizer();
        for (let x = 0; x < 2100; x++) {
            expect(() => pt.token()).not.toThrow();
        }
        expect(() => pt.token()).toThrow(/2100/);
    });
    it('Generates a number of tokens at once.', () => {
        let pt = new ParamTokenizer();
        expect(pt.tokens()).toEqual([]);
        expect(pt.tokens(3)).toEqual(['@p0', '@p1', '@p2']);
        expect(pt.tokens(2)).toEqual(['@p3', '@p4']);
    });
});

describe('#reset', () => {
    it('Resets the counter to 0.', () => {
        let pt = new ParamTokenizer();
        expect(pt.token()).toBe('@p0');
        expect(pt.token()).toBe('@p1');
        expect(() => pt.reset()).not.toThrow();
        expect(pt.token()).toBe('@p0');
    });
    it('Sets a new prefix when specified and sets the counter to 0.', () => {
        let pt = new ParamTokenizer();
        expect(pt.token()).toBe('@p0');
        expect(pt.token()).toBe('@p1');
        expect(() => pt.reset('test')).not.toThrow();
        expect(pt.token()).toBe('@test0');
    });
});