
export default class QuerySegment {
    /**
     * Creates a new `QuerySegment` that contains a partial or full SQL query and the parameters within them.
     * @param {String} segment - The query string segment.
     * @param {Map.<String, *>} params - The parameters that map to the segment.
     */
    constructor(segment, params) {
        //validate
        if (segment && typeof segment !== 'string') {
            throw new Error('The "segment" argument must be null, undefined, or a string.');
        }

        /**
         * @type {String}
         */
        this.segment = segment || '';

        /**
         * @type {Map.<String, *>}
         */
        this.params = null;

        if (params instanceof Map || Array.isArray(params)) {
            this.params = new Map(params);
        } else {
            this.params = new Map();
        }
    }

    /**
     * Concatenates segments and params from the specified `segments` into a new line in the query segment.
     * @param {Number} indent - The number of indent levels (x4 spaces) to indent the line by.
     * @param  {...QuerySegment|String} segments - The `QuerySegments` or strings to combine into this one.
     * @returns {QuerySegment}
     */
    line(indent, ...segments) {
        return this.concat('\n', '    '.repeat(indent), ...segments);
    }

    /**
     * Prepends segments and params from the specified `segments` into this one and returns this instance.
     * @param  {...QuerySegment|String} segments - The `QuerySegments` or strings to prepend into this one.
     * @returns {QuerySegment}
     */
    prepend(...segments) {
        let temp = this.segment;
        this.segment = '';
        this.concat(...segments);
        this.segment += temp;
        return this;
    }

    /**
     * Concatenates segments and params from the specified `segments` into this one and returns this instance.
     * @param  {...QuerySegment|String} segments - The `QuerySegments` or strings to combine into this one.
     * @returns {QuerySegment}
     */
    concat(...segments) {
        if (!this.params) {
            this.params = new Map();
        }
        for (let s of segments) {
            if (s) {
                if (typeof s === 'string') {
                    //concat a string segment
                    this.segment += s;
                } else {
                    //combine QuerySegment
                    if (s.segment) {
                        this.segment += s.segment;
                    }
                    if (s.params.size) {
                        for (let [p, v] of s.params) {
                            if (this.params.has(p)) {
                                throw new Error(`The query segment failed to combine other segments due to a parameter name collision. The parameter named "${p}" was added previously or already exists.`);
                            }
                            this.params.set(p, v);
                        }
                    }
                }
            }
        }
        return this;
    }
}