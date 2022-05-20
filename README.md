# StashKu SQL Storage Engine

## Configuration
This engine utilizes environmental variables and configuration objects that are passed from StashKu. StashKu will pass
any configuration object with the same engine name to the loaded engine itself (as shown in the example below).

```js
let sku = new StashKu({
    engine: '@append/stashku-sql'
    //below, we put all engine-specific configuration in an object with the same name
    '@append/stashku-sql': {
        host: 'localhost',
        post: 1433,
        auth: {
            user: 'first.last',
            password: 'supersecret'
        },
        options: {
            appName: 'my cool app'
        }
    }
});
...
```

### Available Properties
| Property | ENV | Type | Default | Description |
|-|-|-|-|-|
| `driver` | STASHKU_SQL_DRIVER | `String` | `"sql-server"` | Currently only "sql-server" is supported. |
| `host` | STASHKU_SQL_HOST | `String` | `"localhost"` | The network host name of the database server. |
| `port` | STASHKU_SQL_PORT | `Number` | `1433` | The network port listening on the host. |
| `database` | STASHKU_SQL_DATABASE | `String` | `"localhost"` | The database to target. |
| `encrypt` | STASHKU_SQL_ENCRYPT | `Boolean` | `false` | A flag indicating whether the connection to the database should be encrypted (if supported) |
| `trust` | STASHKU_SQL_TRUST | `Boolean` | `false` | Enable or disable the forced trusting of the server certificate (such as self-signed). |
| `auth` |  | `Object` |  |
| ↳ `auth.type` | STASHKU_SQL_AUTH_TYPE | `String` | `"default"` | The authentication type to use with the database. For the `sql-server` driver, this matches the `tedious` [auth types](https://tediousjs.github.io/tedious/api-connection.html), commonly `"ntlm"` or `"azure-active-directory-password"`. |
| ↳ `auth.user` | STASHKU_SQL_AUTH_USER | `String` | | The name of the user used to authenticate against the database server. |
| ↳ `auth.password` | STASHKU_SQL_AUTH_PASSWORD | `String` | | The user password. |
| ↳ `auth.domain` | STASHKU_SQL_AUTH_DOMAIN | `String` | | The FQDN of the NTLM/AD domain the user is under. |
| `batch` |  | `Object` |  |
| ↳ `batch.enabled` |  | `Boolean` | `false` | A flag that toggles whether batching should be enabled whenever supported for `put` and `post` operations. |
| ↳ `batch.size` |  | `Number` | `100` | The maximum number of queries to include in a single batch chunk. The entire batch will be segmented into chunks - one chunk per call to the database. Typically each object in a `put` or `post` generates one query. |
| `log` |  | `Object` |  |
| ↳ `log.queries` | STASHKU_SQL_LOG_QUERIES | `Boolean` | `false` | A flag to enable or disable the output of generated SQL queries to the debug-severity log. |
| ↳ `log.sensitive` | STASHKU_SQL_LOG_SENSITIVE | `Boolean` | `false` | Indicates that SQL query parameters and values will be output in the debug-severity log. These may contain sensitive information, and should only be enabled for debugging purposes. |
| `pool` |  | `Object` |  |
| ↳ `pool.min` |  | `Number` | `0` | The minimum number of connections to keep open. |
| ↳ `pool.max` |  | `Number` | `10` | The maximum number of connections to have open at once. |

You can utilize environmental variables or define the values through a configuration object passed to StashKu. 
This project also loads `.env` files in it's package directory.

#### StashKu Request Customization
This engine supports additional StashKu request metadata, specifically:

| Property | Type | Description |
|-|-|-|
| `batch` | `Boolean` | Forces a `put` or `post` request to operate in "batch" mode, even if the driver configuration is set to disable batching. |
| `output` | `Boolean` | If `false` the RESTful response will not include output from the server- this can save memory and improve performance if you are not going to utilize the results of a request. |

For example, the following posts objects (...) to the database server in "batch" mode, without returning the created records.
```js
let res = await stash.post(r => r
    .to('dbo.Locations')
    .objects(...}
    .meta({
        batch: true,
        output: false
    });
```

### Driver-Specific Configuration Properties
If the database driver you are utilizing supports additional configuration properties, you can place these in an
`.options` object (like the `appName` property shown in the example above).

#### `sql-server` Driver
This driver utilizes the `tedious` package under the `rhino` wrapper, which supports all `tedious` options. You can find a listing of the `tedious` [options here](https://tediousjs.github.io/tedious/api-connection.html).


## REST
The StashKu SQL storage engine supports all RESTful StashKu methods, GET, POST, PUT, PATCH, and DELETE. 

### Example GET Operation
To retrieve information from the database...
```js
let stash = new StashKu({
    engine: '@append/stashku-sql'
});
...
let res = await stash.get(r => r
    .from('dbo.Persons')
    .properties('FirstName', 'LastName', 'Title')
    .where(f => f.and('FirstName', Filter.OP.STARTSWITH, 'K'))
    .skip(0)
    .take(15)
    .sort('LastName', Sort.desc('FirstName'))
);
console.log(res);
```

### Example POST Operation
To add information to the database...
```js
let stash = new StashKu({
    engine: '@append/stashku-sql'
});
...
let res = await stash.post(r => r
    .to('dbo.Locations')
    .objects(
        {
            Name: 'America',
            CostRate: 1,
            Availability: 123
        },
        {
            Name: 'Canada',
            CostRate: 2,
            Availability: 234
        },
        {
            Name: 'Brazil',
            CostRate: 3,
            Availability: 345
        }
    )
);
console.log(res);
```

# Running
Run `npm start`

# Building
This project uses node.js to run and does not have an explicit build process.

## Code Documentation
You can generate a static JSDoc site under the `docs/` path using the command `npm run docs`.

# Test
Run `npm test` to run jest unit tests.

Run `npm run lint` to run ESLint, optionally install the Visual Studio Code ESLint extension to have linting issues show in your "Problems" tab and be highlighted.

If you are writing unit tests, you may need to `npm install @types/jest` to get intellisense in Visual Studio Code if for some reason it did not get installed.

## Setup
This project leverages the docker image `chriseaton/adventureworks:latest` using the AdventureWorks sample database (created by Microsoft) to perform database tests.

You can grab and start the AdventureWorks sample database on your system in the background by running:
```
docker run -p 1433:1433 -e 'ACCEPT_EULA=Y' -e 'SA_PASSWORD={mySup3r_p4ssw0rd}' -d chriseaton/adventureworks:latest
```
The password can be set to whatever you wish. The docker container may take a minute to get initialized once started.

You will need to set the environmental variables to match the docker container's settings, for example:

| ENV | Example Value |
|-----|---------------|
| STASHKU_SQL_HOST     | `"localhost"` |
| STASHKU_SQL_DATABASE | `"AdventureWorks"` |
| STASHKU_SQL_AUTH_USER | `"sa"` |
| STASHKU_SQL_AUTH_PASSWORD | `"mySup3r_p4ssw0rd"` |