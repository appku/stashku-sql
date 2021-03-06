///<reference path="./modeling.d.js" />
import Model from './model.js';

/**
 * The base class for `ProductionCultureModel` instances for the "Production.Culture" storage resource.
 * Exported: 2022-05-24T04:18:59.430Z
 *
 * **WARNING**    
 * THIS CLASS IS AUTOMATICALLY GENERATED DURING STASHKU OPTIONS EXPORTS.    
 * CUSTOMIZATIONS WILL BE OVERWRITTEN ON NEW OPTIONS EXPORTS.    
 * Use the non-autogenerated (base) class files to add unique customizations.
 */
class BaseProductionCultureModel extends Model {
    constructor() {
        super();
        
        /**
         * Maximum character length in data storage: 6.
         * This is a primary-key property (it helps uniquely identify a model).
         * @type {String}
         */
        this.CultureID = this.constructor.CultureID.default ?? null;
        
        /**
         * @type {Date}
         */
        this.ModifiedDate = this.constructor.ModifiedDate.default ?? null;
        
        /**
         * Maximum character length in data storage: 50.
         * @type {String}
         */
        this.Name = this.constructor.Name.default ?? null;
        
    }
    
    /**
     * StashKu property definition for CultureID.
     * @type {Modeling.PropertyDefinition}
     */
    static get CultureID() {
        return {
            target: 'CultureID',
            type: 'String',
            pk: true,
            charLength: 6,
            omit: {
                post: null,
                put: null
            }
        };
    }
    
    /**
     * StashKu property definition for ModifiedDate.
     * @type {Modeling.PropertyDefinition}
     */
    static get ModifiedDate() {
        return {
            target: 'ModifiedDate',
            type: 'Date',
            omit: {
                post: null,
                put: null
            }
        };
    }
    
    /**
     * StashKu property definition for Name.
     * @type {Modeling.PropertyDefinition}
     */
    static get Name() {
        return {
            target: 'Name',
            type: 'String',
            charLength: 50,
            default: ''
        };
    }
    
    /**
     * The StashKu resource configuration for this model.
     * @type {Modeling.Configuration}
     */
    static get $stashku() {
        return {
            resource: 'Production.Culture',
            name: 'ProductionCulture',
            slug: 'production-culture',
            plural: {
                name: 'ProductionCultures',
                slug: 'production-cultures'
            }
        };
    }
    
}

export default BaseProductionCultureModel;
