
/**
 * @enum {String}
 */
const SQLServer = {
    Bit: 'Bit',
    TinyInt: 'TinyInt',
    SmallInt: 'SmallInt',
    Int: 'Int',
    BigInt: 'BigInt',
    Numeric: 'Numeric',
    Decimal: 'Decimal',
    SmallDateTime: 'SmallDateTime',
    Real: 'Real',
    Money: 'Money',
    DateTime: 'DateTime',
    Float: 'Float',
    SmallMoney: 'SmallMoney',
    Image: 'Image',
    Text: 'Text',
    UniqueIdentifier: 'UniqueIdentifier',
    NText: 'NText',
    VarBinary: 'VarBinary',
    VarChar: 'VarChar',
    Binary: 'Binary',
    Char: 'Char',
    NVarChar: 'NVarChar',
    NChar: 'NChar',
    Xml: 'Xml',
    Time: 'Time',
    Date: 'Date',
    DateTime2: 'DateTime2',
    DateTimeOffset: 'DateTimeOffset',
    UDT: 'UDT',
    TVP: 'TVP',
    Variant: 'Variant'
};

/**
 * @enum {String}
 */
const Postgres = {
    Bit: 'bit',
    VarBit: 'varbit',
    Boolean: 'bool',
    SmallInt: 'int2',
    Int: 'int4',
    BigInt: 'int8',
    Decimal: 'decimal',
    Real: 'float4',
    Double: 'float8',
    Money: 'money',
    Char: 'char',
    VarChar: 'varchar',
    Text: 'text',
    JSON: 'json',
    JSONB: 'jsonb',
    Xml: 'xml',
    ByteA: 'bytea',
    CIDR: 'cidr',
    INET: 'inet',
    MACAddress: 'macaddr',
    Date: 'date',
    Time: 'time',
    TimeTZ: 'timetz',
    Timestamp: 'timestamp',
    TimestampTZ: 'timestamptz',
    Interval: 'interval',
    BigSerial: 'serial8',
    Serial: 'serial4',
    SmallSerial: 'serial2',
    UUID: 'uuid',
    //less common
    Box: 'box',
    Circle: 'circle',
    Line: 'line',
    LineSegment: 'lseg',
    Path: 'path',
    PgLogSequenceNumber: 'pg_lsn',
    Point: 'point',
    Polygon: 'polygon',
    TextSearchQuery: 'tsquery',
    TextSearchVector: 'tsvector',
    TxIDSnapshot: 'txid_snapshot'
};

export {
    SQLServer as SQLServerTypes,
    Postgres as PostgresTypes
};