///<reference path="./modeling.d.js" />
import Model from './model.js';

/**
 * The base class for `PurchasingVendorModel` instances for the "[Purchasing].[Vendor]" storage resource.
 * Exported: 2022-05-23T01:03:29.170Z
 *
 * **WARNING**    
 * THIS CLASS IS AUTOMATICALLY GENERATED DURING STASHKU OPTIONS EXPORTS.    
 * CUSTOMIZATIONS WILL BE OVERWRITTEN ON NEW OPTIONS EXPORTS.    
 * Use the non-autogenerated (base) class files to add unique customizations.
 */
class BasePurchasingVendorModel extends Model {
    constructor() {
        super();
        
        /**
         * Maximum character length in data storage: 15.
         * @type {String}
         */
        this.AccountNumber = this.constructor.AccountNumber.default ?? null;
        
        /**
         * @type {Boolean}
         */
        this.ActiveFlag = this.constructor.ActiveFlag.default ?? null;
        
        /**
         * The precision (max. amount of numbers) is 10.
         * The number of decimal places is set to 10.
         * This is a primary-key property (it helps uniquely identify a model).
         * @type {Number}
         */
        this.BusinessEntityID = this.constructor.BusinessEntityID.default ?? null;
        
        /**
         * The precision (max. amount of numbers) is 3.
         * The number of decimal places is set to 10.
         * @type {Number}
         */
        this.CreditRating = this.constructor.CreditRating.default ?? null;
        
        /**
         * @type {Date}
         */
        this.ModifiedDate = this.constructor.ModifiedDate.default ?? null;
        
        /**
         * Maximum character length in data storage: 50.
         * @type {String}
         */
        this.Name = this.constructor.Name.default ?? null;
        
        /**
         * @type {Boolean}
         */
        this.PreferredVendorStatus = this.constructor.PreferredVendorStatus.default ?? null;
        
        /**
         * Maximum character length in data storage: 1024.
         * @type {String}
         */
        this.PurchasingWebServiceURL = this.constructor.PurchasingWebServiceURL.default ?? null;
        
    }
    
    /**
     * StashKu property definition for AccountNumber.
     * @type {Modeling.PropertyDefinition}
     */
    static get AccountNumber() {
        return {
            target: 'AccountNumber',
            type: 'String',
            charLength: 15,
            default: ''
        };
    }
    
    /**
     * StashKu property definition for ActiveFlag.
     * @type {Modeling.PropertyDefinition}
     */
    static get ActiveFlag() {
        return {
            target: 'ActiveFlag',
            type: 'Boolean'
        };
    }
    
    /**
     * StashKu property definition for BusinessEntityID.
     * @type {Modeling.PropertyDefinition}
     */
    static get BusinessEntityID() {
        return {
            target: 'BusinessEntityID',
            type: 'Number',
            pk: true,
            precision: 10,
            radix: 10,
            omit: {
                post: null
            }
        };
    }
    
    /**
     * StashKu property definition for CreditRating.
     * @type {Modeling.PropertyDefinition}
     */
    static get CreditRating() {
        return {
            target: 'CreditRating',
            type: 'Number',
            precision: 3,
            radix: 10,
            default: 0
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
                post: null
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
     * StashKu property definition for PreferredVendorStatus.
     * @type {Modeling.PropertyDefinition}
     */
    static get PreferredVendorStatus() {
        return {
            target: 'PreferredVendorStatus',
            type: 'Boolean'
        };
    }
    
    /**
     * StashKu property definition for PurchasingWebServiceURL.
     * @type {Modeling.PropertyDefinition}
     */
    static get PurchasingWebServiceURL() {
        return {
            target: 'PurchasingWebServiceURL',
            type: 'String',
            charLength: 1024
        };
    }
    
    /**
     * The StashKu resource configuration for this model.
     * @type {Modeling.Configuration}
     */
    static get $stashku() {
        return {
            resource: '[Purchasing].[Vendor]',
            name: 'PurchasingVendor',
            slug: 'purchasing-vendor',
            plural: {
                name: 'PurchasingVendors',
                slug: 'purchasing-vendors'
            }
        };
    }
    
}

export default BasePurchasingVendorModel;