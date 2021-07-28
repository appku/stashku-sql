
/**
 * This utility class helps generate new parameter names (tokens) using a counter that increments whenever
 * a new token (name) is generated. This is useful for ensuring unique parameter names in queries and that
 * the supported maximum is not exceeded.
 */
export default class ParamTokenizer {
    constructor(prefix) {

        /**
         * @type {String}
         */
        this.prefix = prefix || 'p';

        /**
         * The counter indicating where the next generated parameter name suffix number.
         * @type {Number}
         */
        this.counter = 0;

    }

    /**
     * Returns a SQL parameter name including the '@' symbol.
     * @returns {String}
     */
    token() {
        if (this.counter >= 2100) {
            //prevent hitting SQL server parameter maximums per-query.
            throw new Error('The token count in excess of 2100 is not supported. Too many tokens are being generated than are supported by database drivers.');
        }
        let t = `@${this.prefix}${this.counter}`;
        this.counter++;
        return t;
    }

    /**
     * Returns an array of SQL parameter names including the '@' symbol. The number of parameter names will be
     * the `count` specified.
     * @param {Number} count - The number of parameter names to generate tokens for.
     * @returns {Array.<String>}
     */
    tokens(count) {
        let output = [];
        for (let x = 0; x < count; x++) {
            output.push(this.token());
        }
        return output;
    }

    /**
     * Resets the tokenizer counter to 0 and optionally changes the prefix.
     * @param {String} [prefix] - Optional new prefix to use. If falsey the prefix will not be changed.
     */
    reset(prefix) {
        if (prefix) {
            this.prefix = prefix;
        }
        this.counter = 0;
    }

}