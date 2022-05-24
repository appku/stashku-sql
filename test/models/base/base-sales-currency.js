///<reference path="./modeling.d.js" />
import Model from './model.js';

/**
 * The base class for `SalesCurrencyModel` instances for the "Sales.Currency" storage resource.
 * Exported: 2022-05-24T05:06:17.834Z
 *
 * **WARNING**    
 * THIS CLASS IS AUTOMATICALLY GENERATED DURING STASHKU OPTIONS EXPORTS.    
 * CUSTOMIZATIONS WILL BE OVERWRITTEN ON NEW OPTIONS EXPORTS.    
 * Use the non-autogenerated (base) class files to add unique customizations.
 */
class BaseSalesCurrencyModel extends Model {
    constructor() {
        super();
        
        /**
         * Maximum character length in data storage: 3.
         * This is a primary-key property (it helps uniquely identify a model).
         * @type {String}
         */
        this.CurrencyCode = this.constructor.CurrencyCode.default ?? null;
        
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
     * StashKu property definition for CurrencyCode.
     * @type {Modeling.PropertyDefinition}
     */
    static get CurrencyCode() {
        return {
            target: 'CurrencyCode',
            type: 'String',
            pk: true,
            charLength: 3,
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
            resource: 'Sales.Currency',
            name: 'SalesCurrency',
            slug: 'sales-currency',
            plural: {
                name: 'SalesCurrencies',
                slug: 'sales-currencies'
            }
        };
    }
    
}

export default BaseSalesCurrencyModel;
