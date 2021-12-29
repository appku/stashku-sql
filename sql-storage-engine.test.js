import SQLStorageEngine from './sql-storage-engine.js';
import SQLTypes from './sql-types.js';
import { GetRequest, PostRequest, PutRequest, PatchRequest, DeleteRequest, OptionsRequest, Filter, Response, ModelConfiguration } from '@appku/stashku';
import dotenv from 'dotenv';

dotenv.config();

describe('#constructor', () => {
    it('sets the engine name to "sql".', () => {
        expect(new SQLStorageEngine().name).toBe('sql');
    });
});

describe('#resources', () => {
    it('gets a list of table and view names.', async () => {
        let e = new SQLStorageEngine();
        e.configure();
        let names = await e.resources();
        expect(names.length).toBeGreaterThan(0);
        for (let n of names) {
            expect(n).toMatch(/.+\..+/i);
        }
        await e.destroy();
    });
});

// describe('#bulk', () => {
//     it('bulk inserts rows into a table.', async () => {
//         let e = new SQLStorageEngine();
//         e.configure();
//         let columns = new Map();
//         let rows = [];
//         columns.set('Name', { type: SQLTypes.NVarChar, nullable: false });
//         columns.set('ModifiedDate', { type: SQLTypes.DateTime, nullable: false });
//         for (let x = 0; x < 1000; x++) {
//             rows.push({
//                 Name: `Test${x}`,
//                 ModifiedDate: new Date()
//             });
//         }
//         let count = await e.bulk('Person.ContactType', columns, rows);
//         expect(count).toBe(1000);
//         await e.destroy();
//     });
// });

describe('#get', () => {
    it('gets results from the database.', async () => {
        let e = new SQLStorageEngine();
        e.configure();
        let results = await e.get(new GetRequest()
            .from('Person.Person')
            .properties('FirstName', 'LastName', 'Title')
            .where(f => f.and('FirstName', Filter.OP.STARTSWITH, 'K'))
            .skip(0)
            .take(15)
            .sort('LastName', 'FirstName')
        );
        e.destroy();
        expect(results).toBeInstanceOf(Response);
        expect(results.data.length).toBe(results.returned);
        expect(results.total).toBe(1255);
        expect(results.affected).toBe(0);
        expect(results.returned).toBe(15);
    });
    it('runs a count-only query with paging.', async () => {
        let e = new SQLStorageEngine();
        e.configure();
        let results = await e.get(new GetRequest()
            .from('Person.Person')
            .properties('FirstName', 'LastName', 'Title')
            .where(f => f.and('FirstName', Filter.OP.STARTSWITH, 'K'))
            .skip(0)
            .take(15)
            .count()
        );
        e.destroy();
        expect(results).toBeInstanceOf(Response);
        expect(results.data.length).toBe(0);
        expect(results.total).toBe(1255);
        expect(results.affected).toBe(0);
        expect(results.returned).toBe(15);
    });
    it('runs a count-only distinct query with paging.', async () => {
        let e = new SQLStorageEngine();
        e.configure();
        let results = await e.get(new GetRequest()
            .from('Person.Person')
            .properties('Title')
            .distinct()
            .skip(5)
            .take(5)
            .count()
        );
        e.destroy();
        expect(results).toBeInstanceOf(Response);
        expect(results.data.length).toBe(0);
        expect(results.total).toBe(7);
        expect(results.affected).toBe(0);
        expect(results.returned).toBe(2);
    });
    it('runs a distinct query.', async () => {
        let e = new SQLStorageEngine();
        e.configure();
        let results = await e.get(new GetRequest()
            .from('Person.Person')
            .properties('FirstName')
            .where(f => f.and('FirstName', Filter.OP.STARTSWITH, 'Ad'))
            .distinct()
        );
        e.destroy();
        expect(results).toBeInstanceOf(Response);
        expect(results.data.length).toBe(5);
        expect(results.total).toBe(5);
    });
});

// describe('#post', () => {
//     it('bulk+batch loads records.', async () => {
//         let e = new SQLStorageEngine();
//         e.configure();
//         await e.raw('DELETE FROM Production.Location WHERE LocationID > 60;');
//         let rows = [];
//         for (let x = 0; x < 1000; x++) {
//             rows.push({
//                 Name: `PostBulkBatch_Test${x}`,
//                 CostRate: x * 0.5,
//                 Availability: x + Math.random()
//             });
//         }
//         let results = await e.post(new PostRequest()
//             .to('Production.Location')
//             .objects(rows)
//             .headers({
//                 batch: {
//                     enabled: true,
//                     size: 100
//                 },
//                 bulk: {
//                     Name: { type: SQLTypes.NVarChar, nullable: false },
//                     CostRate: { type: SQLTypes.SmallMoney, nullable: false },
//                     Availability: { type: SQLTypes.Decimal, nullable: false, precision: 8, scale: 2 },
//                 }
//             })
//         );
//         e.destroy();
//         expect(results).toBeInstanceOf(Response);
//         expect(results.data.length).toBe(0);
//         expect(results.total).toBe(1000);
//         expect(results.affected).toBe(1000);
//         expect(results.returned).toBe(0);
//     }, 30000);
//     it('adds new objects to the database.', async () => {
//         let e = new SQLStorageEngine();
//         e.configure();
//         let results = await e.post(new PostRequest()
//             .to('Production.Location')
//             .objects(
//                 {
//                     Name: 'AA',
//                     CostRate: 1,
//                     Availability: 123
//                 },
//                 {
//                     Name: 'BB',
//                     CostRate: 2,
//                     Availability: 234
//                 },
//                 {
//                     Name: 'CC',
//                     CostRate: 3,
//                     Availability: 345
//                 }
//             )
//         );
//         e.destroy();
//         expect(results).toBeInstanceOf(Response);
//         expect(results.data.length).toBe(results.total);
//         expect(results.total).toBe(3);
//         expect(results.affected).toBe(3);
//         expect(results.returned).toBe(3);
//     });
// });

// describe('#put', () => {
//     it('updates objects in the database.', async () => {
//         let e = new SQLStorageEngine();
//         e.configure();
//         let results = await e.put(new PutRequest()
//             .to('Production.Product')
//             .pk('ProductID')
//             .objects(
//                 {
//                     ProductID: 1,
//                     Name: 'Bananas',
//                     ProductNumber: 'BAN-1111',
//                     Color: 'Yellow',
//                     SafetyStockLevel: 46
//                 },
//                 {
//                     ProductID: 2,
//                     Name: 'Kiwi',
//                     ProductNumber: 'KIW-7984',
//                     Color: 'Brown',
//                     SafetyStockLevel: 64
//                 }
//             )
//         );
//         e.destroy();
//         expect(results).toBeInstanceOf(Response);
//         expect(results.data.length).toBe(results.total);
//         expect(results.total).toBe(2);
//     });
// });

// describe('#patch', () => {
//     it.only('updates objects in the database from a template.', async () => {
//         let e = new SQLStorageEngine();
//         e.configure();
//         let results = await e.patch(new PatchRequest()
//             .to('Production.Product')
//             .template(
//                 {
//                     Color: 'Assorted',
//                     SafetyStockLevel: 1
//                 }
//             )
//             .where(f => f
//                 .and('ProductID', Filter.OP.IN, [317, 318, 319, 320])
//                 .and('ProductNumber', Filter.OP.STARTSWITH, 'CA')
//             )
//         );
//         e.destroy();
//         expect(results).toBeInstanceOf(Response);
//         expect(results.data.length).toBe(results.total);
//         expect(results.total).toBe(2);
//     });
// });

// describe('#delete', () => {
//     it('deletes objects in the database matching conditions.', async () => {
//         let e = new SQLStorageEngine();
//         e.configure();
//         let results = await e.delete(new DeleteRequest()
//             .from('Person.EmailAddress')
//             .where(f => f
//                 .and('EmailAddress', Filter.OP.STARTSWITH, 'ke')
//             )
//         );
//         e.destroy();
//         expect(results).toBeInstanceOf(Response);
//         expect(results.data.length).toBe(results.total);
//         expect(results.total).toBe(300);
//     });
// });

describe('#options', () => {
    let e = new SQLStorageEngine();
    e.configure();
    afterAll(()=>{
        e.destroy();
    });
    it('throws a 404 when an invalid resource is specified.', async () => {
        expect.assertions(2);
        try {
            await e.options(new OptionsRequest()
                .from('test')
            );
        } catch (err) {
            expect(err.toString()).toMatch(/resource.+not found/i);
            expect(err.code).toBe(404);
        }
    });
    it('returns a model type with a proper model configuration.', async () => {
        let res = await e.options(new OptionsRequest('Person.Person'));
        expect(res.code).toBe(200);
        expect(res.data.length).toBe(1);
        expect(res.data[0].name).toBe('PersonPersonModel');
        expect(res.data[0].businessEntityID.target).toBe('BusinessEntityID');
        expect(res.data[0].businessEntityID.pk).toBeTruthy();
        expect(res.data[0].businessEntityID.default).toBeUndefined();
        expect(res.data[0].firstName.target).toBe('FirstName');
        expect(res.data[0].firstName.default).toBe('');
        expect(res.data[0].$stashku).toBeInstanceOf(ModelConfiguration);
    });
});