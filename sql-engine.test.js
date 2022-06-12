import SQLEngine from './sql-engine.js';
import { SQLServerTypes, PostgresTypes } from './sql-types.js';
import StashKu, { GetRequest, PostRequest, PutRequest, PatchRequest, DeleteRequest, OptionsRequest, Filter, Response } from '@appku/stashku';
import ProductionCultureModel from './test/models/production-culture.js';
import PurchasingVendorModel from './test/models/purchasing-vendor.js';
import SalesCurrencyModel from './test/models/sales-currency.js';
import fs from 'fs/promises';
import dotenv from 'dotenv';

let drivers = ['sql-server']; //, 'postgres'];
for (let driver of drivers) {

    describe(`With "${driver}" driver...`, () => {
        beforeAll(() => {
            dotenv.config({ path: `driver-${driver}.env` });
        });
        describe('#constructor', () => {
            it('sets the engine name to "sql".', () => {
                expect(new SQLEngine().name).toBe('sql');
            });
        });

        describe('#resources', () => {
            it('gets a list of table and view names.', async () => {
                let e = new SQLEngine();
                e.configure();
                let names = await e.resources();
                expect(names.length).toBeGreaterThan(0);
                for (let n of names) {
                    expect(n).toMatch(/.+\..+/i);
                }
                await e.destroy();
            });
        });

        describe('#raw', () => {
            let e = new SQLEngine();
            beforeAll(() => e.configure());
            afterAll(async () => {
                await e.destroy();
            });
            it('runs a select query with parameters', async () => {
                let results = await e.raw('SELECT FirstName, LastName, BusinessEntityID FROM Person.Person WHERE FirstName LIKE @fn AND BusinessEntityID > @idMin', { fn: 'Ab%', idMin: 3900 });
                expect(Array.isArray(results)).toBe(true);
                expect(results.length).toBe(91);
                for (let r of results) {
                    expect(r.FirstName).toMatch(/^Ab/);
                    expect(r.BusinessEntityID).toBeGreaterThanOrEqual(3900);
                }
            });
        });

        describe('#bulk', () => {
            let e = new SQLEngine();
            beforeAll(() => e.configure());
            afterAll(async () => {
                await e.raw('DELETE FROM Person.ContactType WHERE ContactTypeID > 20;');
                await e.destroy();
            });
            it('bulk inserts rows into a table.', async () => {
                let columns = new Map();
                let rows = [];
                columns.set('Name', { type: SQLServerTypes.NVarChar, nullable: false });
                columns.set('ModifiedDate', { type: SQLServerTypes.DateTime, nullable: false });
                for (let x = 0; x < 250; x++) {
                    rows.push({
                        Name: `Test${x}`,
                        ModifiedDate: new Date()
                    });
                }
                let count = await e.bulk('Person.ContactType', columns, rows);
                expect(count).toBe(250);
            });
        });

        describe('#get', () => {
            let stash = null;
            beforeAll(() => {
                stash = new StashKu({ engine: '@appku/stashku-sql' });
            });
            afterAll(() => {
                return stash.destroy();
            });
            it('gets results from the database.', async () => {
                await stash.engine;
                let results = await stash.engine.get(new GetRequest()
                    .from('Person.Person')
                    .properties('FirstName', 'LastName', 'Title')
                    .where(f => f.and('FirstName', Filter.OP.STARTSWITH, 'K'))
                    .skip(0)
                    .take(15)
                    .sort('LastName', 'FirstName')
                );
                expect(results).toBeInstanceOf(Response);
                expect(results.data.length).toBe(results.returned);
                expect(results.total).toBe(1255);
                expect(results.affected).toBe(0);
                expect(results.returned).toBe(15);
            });
            it('runs a count-only query with paging.', async () => {
                let results = await stash.engine.get(new GetRequest()
                    .from('Person.Person')
                    .properties('FirstName', 'LastName', 'Title')
                    .where(f => f.and('FirstName', Filter.OP.STARTSWITH, 'K'))
                    .skip(0)
                    .take(15)
                    .count()
                );
                expect(results).toBeInstanceOf(Response);
                expect(results.data.length).toBe(0);
                expect(results.total).toBe(1255);
                expect(results.affected).toBe(0);
                expect(results.returned).toBe(15);
            });
            it('runs a count-only distinct query with paging.', async () => {
                let results = await stash.engine.get(new GetRequest()
                    .from('Person.Person')
                    .properties('Title')
                    .distinct()
                    .skip(5)
                    .take(5)
                    .count()
                );
                expect(results).toBeInstanceOf(Response);
                expect(results.data.length).toBe(0);
                expect(results.total).toBe(7);
                expect(results.affected).toBe(0);
                expect(results.returned).toBe(2);
            });
            it('runs a distinct query.', async () => {
                let results = await stash.engine.get(new GetRequest()
                    .from('Person.Person')
                    .properties('FirstName')
                    .where(f => f.and('FirstName', Filter.OP.STARTSWITH, 'Ad'))
                    .distinct()
                );
                expect(results).toBeInstanceOf(Response);
                expect(results.data.length).toBe(5);
                expect(results.total).toBe(5);
            });
            it('runs a simple modeled query.', async () => {
                let results = await stash.model(PurchasingVendorModel).get();
                expect(results.affected).toBe(0);
                expect(results.total).toBe(104);
                expect(results.returned).toBe(104);
                expect(results.data.length).toBe(104);
                for (let m of results.data) {
                    expect(m).toBeInstanceOf(PurchasingVendorModel);
                    expect(m.BusinessEntityID).toBeTruthy();
                    expect(typeof m.Name).toBe('string');
                }
            });
            it('runs a simple modeled query with constraints.', async () => {
                let results = await stash.model(PurchasingVendorModel).get((r, m) => r
                    .properties(m.Name, m.CreditRating)
                    .where(f => f.and(m.Name, f.OP.CONTAINS, 'e'))
                    .take(3)
                );
                expect(results.affected).toBe(0);
                expect(results.total).toBe(95);
                expect(results.returned).toBe(3);
                expect(results.data.length).toBe(3);
                for (let m of results.data) {
                    expect(m).toBeInstanceOf(PurchasingVendorModel);
                    expect(m.BusinessEntityID).toBeUndefined();
                    expect(typeof m.Name).toBe('string');
                    expect(typeof m.CreditRating).toBe('number');
                }
            });
        });

        describe('#post', () => {
            let stash = null;
            beforeAll(() => {
                stash = new StashKu({ engine: '@appku/stashku-sql' });
            });
            afterAll(async () => {
                await stash.engine.raw('DELETE FROM Production.Location WHERE LocationID > 60;');
                await stash.engine.raw('DELETE FROM Production.Culture WHERE ModifiedDate > \'01-01-2009\';');
                return stash.destroy();
            });
            it('bulk+batch loads records.', async () => {
                let rows = [];
                //prep data
                for (let x = 0; x < 100; x++) {
                    rows.push({
                        Name: `PostBulkBatch_Test${x}`,
                        CostRate: x * 0.5,
                        Availability: x + Math.random()
                    });
                }
                //run request
                let results = await stash.engine.post(new PostRequest()
                    .to('Production.Location')
                    .objects(rows)
                    .headers({
                        batch: {
                            enabled: true,
                            size: 10
                        },
                        bulk: {
                            Name: { type: SQLServerTypes.NVarChar, nullable: false },
                            CostRate: { type: SQLServerTypes.SmallMoney, nullable: false },
                            Availability: { type: SQLServerTypes.Decimal, nullable: false, precision: 8, scale: 2 },
                        }
                    })
                );
                expect(results).toBeInstanceOf(Response);
                expect(results.data.length).toBe(0);
                expect(results.total).toBe(100);
                expect(results.affected).toBe(100);
                expect(results.returned).toBe(0);
            }, 30000);
            it('adds new objects to the database.', async () => {
                let results = await stash.engine.post(new PostRequest()
                    .to('Production.Location')
                    .objects(
                        {
                            Name: 'AA',
                            CostRate: 1,
                            Availability: 123
                        },
                        {
                            Name: 'BB',
                            CostRate: 2,
                            Availability: 234
                        },
                        {
                            Name: 'CC',
                            CostRate: 3,
                            Availability: 345
                        }
                    )
                );
                expect(results).toBeInstanceOf(Response);
                expect(results.data.length).toBe(results.total);
                expect(results.total).toBe(3);
                expect(results.affected).toBe(3);
                expect(results.returned).toBe(3);
            });
            it('adds modeled objects to a table', async () => {
                let m1 = new ProductionCultureModel();
                let m2 = new ProductionCultureModel();
                m1.CultureID = 'az-AZ';
                m1.Name = 'Republic of Arizona';
                m2.CultureID = 'cs-CA';
                m2.Name = 'The Free People of Cascadia';
                let results = await stash.model(ProductionCultureModel).post(r => r.objects(m1, m2));
                expect(results).toBeInstanceOf(Response);
                expect(results.data.length).toBe(results.total);
                expect(results.total).toBe(2);
                expect(results.affected).toBe(2);
                expect(results.returned).toBe(2);
            });
        });

        describe('#put', () => {
            let stash = null;
            beforeAll(() => {
                stash = new StashKu({ engine: '@appku/stashku-sql' });
            });
            afterAll(async () => {
                await stash.engine.raw('UPDATE Production.Culture SET [Name] = \'Arabic\' WHERE CultureID = \'ar\';');
                return stash.destroy();
            });
            it('updates objects in the database.', async () => {
                let results = await stash.engine.put(new PutRequest()
                    .to('Production.Product')
                    .pk('ProductID')
                    .objects(
                        {
                            ProductID: 1,
                            Name: 'Bananas',
                            ProductNumber: 'BAN-1111',
                            Color: 'Yellow',
                            SafetyStockLevel: 46
                        },
                        {
                            ProductID: 2,
                            Name: 'Kiwi',
                            ProductNumber: 'KIW-7984',
                            Color: 'Brown',
                            SafetyStockLevel: 64
                        }
                    )
                );
                expect(results).toBeInstanceOf(Response);
                expect(results.data.length).toBe(results.total);
                expect(results.total).toBe(2);
            });
            it('updates a modeled record.', async () => {
                let m1 = new ProductionCultureModel();
                m1.CultureID = 'ar';
                m1.Name = 'Middle East';
                let results = await stash.model(ProductionCultureModel).put((r, m) => r.objects(m1));
                expect(results).toBeInstanceOf(Response);
                expect(results.data.length).toBe(results.total);
                expect(results.data[0].Name).toBe('Middle East');
                expect(results.total).toBe(1);
                expect(results.affected).toBe(1);
                expect(results.returned).toBe(1);
            });
        });

        describe('#patch', () => {
            let stash = null;
            beforeAll(() => {
                stash = new StashKu({ engine: '@appku/stashku-sql' });
            });
            afterAll(async () => {
                await stash.engine.raw('UPDATE Sales.Currency SET [Name] = \'Lek\' WHERE CurrencyCode = \'ALL\';');
                return stash.destroy();
            });
            it('updates objects in the database from a template.', async () => {
                let results = await stash.engine.patch(new PatchRequest()
                    .to('Production.Product')
                    .template(
                        {
                            Color: 'Assorted',
                            SafetyStockLevel: 1
                        }
                    )
                    .where(f => f
                        .and('ProductID', Filter.OP.IN, [317, 318, 319, 320])
                        .and('ProductNumber', Filter.OP.STARTSWITH, 'CA')
                    )
                );
                expect(results).toBeInstanceOf(Response);
                expect(results.data.length).toBe(results.total);
                expect(results.total).toBe(3);
            });
            it('updates using a modeled template.', async () => {
                let m1 = new SalesCurrencyModel();
                m1.Name = 'Hamburger';
                delete m1.CurrencyCode;
                delete m1.ModifiedDate;
                let results = await stash.model(SalesCurrencyModel).patch((r, m) => r
                    .template(m1)
                    .where(f => f.and(m.CurrencyCode, f.OP.IN, ['ALL', 'ANY']))
                );
                expect(results).toBeInstanceOf(Response);
                expect(results.data.length).toBe(results.total);
                expect(results.data[0].CurrencyCode).toBe('ALL');
                expect(results.data[0].Name).toBe('Hamburger');
                expect(results.total).toBe(1);
                expect(results.affected).toBe(1);
                expect(results.returned).toBe(1);
            });
        });

        describe('#delete', () => {
            let stash = null;
            beforeAll(async () => {
                stash = new StashKu({ engine: '@appku/stashku-sql' });
                await stash.engine;
                let preload = JSON.parse(await fs.readFile('./test/delete/Person.PersonPhone.json'));
                let promises = [];
                for (let row of preload) {
                    promises.push(stash.engine.raw('INSERT INTO Person.PersonPhone (BusinessEntityID, PhoneNumber, PhoneNumberTypeID) VALUES (@BusinessEntityID, @PhoneNumber, @PhoneNumberTypeID)', row));
                }
                await Promise.all(promises);
            });
            afterAll(async () => {
                await stash.engine.raw('DELETE FROM Person.PersonPhone WHERE PhoneNumber LIKE \'123-4%\';');
                return stash.destroy();
            });
            it('deletes objects in the database matching conditions.', async () => {
                let results = await stash.engine.delete(new DeleteRequest()
                    .from('Person.PersonPhone')
                    .where(f => f
                        .and('PhoneNumber', Filter.OP.STARTSWITH, '123-456')
                    )
                );
                expect(results).toBeInstanceOf(Response);
                expect(results.data.length).toBe(results.total);
                expect(results.total).toBe(5);
            });
        });

        describe('#options', () => {
            let stash = null;
            beforeAll(() => {
                stash = new StashKu({ engine: '@appku/stashku-sql' });
            });
            afterAll(async () => {
                return stash.destroy();
            });
            it('throws a 404 when an invalid resource is specified.', async () => {
                expect.assertions(2);
                try {
                    await stash.engine.options(new OptionsRequest()
                        .from('test')
                    );
                } catch (err) {
                    expect(err.toString()).toMatch(/resource.+not found/i);
                    expect(err.code).toBe(404);
                }
            });
            it('returns a model type with a proper model configuration.', async () => {
                let res = await stash.engine.options(new OptionsRequest('Person.Person'));
                expect(res.code).toBe(200);
                expect(res.data.length).toBe(1);
                expect(res.data[0].name).toBe('PersonPersonModel');
                expect(res.data[0].BusinessEntityID.target).toBe('BusinessEntityID');
                expect(res.data[0].BusinessEntityID.pk).toBeTruthy();
                expect(res.data[0].BusinessEntityID.omit).toEqual({ post: null, put: null });
                expect(res.data[0].BusinessEntityID.default).toBeUndefined();
                expect(res.data[0].FirstName.target).toBe('FirstName');
                expect(res.data[0].FirstName.default).toBe('');
                expect(res.data[0].$stashku).toBeTruthy();
            });
        });

    });
}