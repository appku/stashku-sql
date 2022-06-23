SELECT 
    isc.TABLE_CATALOG AS [catalog],
    isc.TABLE_SCHEMA AS [schema],
    isc.TABLE_NAME AS [name],
    isc.COLUMN_NAME AS [property],
    CAST(ISNULL(con.Keyed, 0) AS BIT) AS keyed,
    isc.ORDINAL_POSITION AS position,
    CAST((CASE
        WHEN isc.IS_NULLABLE LIKE 'Y%' THEN 1
        ELSE 0
    END) AS BIT) AS nullable,
    CAST((CASE
        WHEN isc.COLUMN_DEFAULT IS NOT NULL THEN 1
        ELSE 0
    END) AS BIT) AS hasDefault,
    UPPER(isc.DATA_TYPE) AS dataType,
    isc.CHARACTER_MAXIMUM_LENGTH AS charLength,
    isc.NUMERIC_PRECISION AS numberPrecision,
    isc.NUMERIC_PRECISION_RADIX AS numberRadix,
    CAST((CASE
        WHEN v.TABLE_SCHEMA IS NOT NULL THEN 1
        ELSE 0
    END) AS BIT) AS isView,
    CAST((CASE
        WHEN UPPER(v.IS_UPDATABLE) = 'YES' THEN 1
        ELSE 0
    END) AS BIT) AS isUpdatableView
    FROM INFORMATION_SCHEMA.COLUMNS isc
        LEFT JOIN INFORMATION_SCHEMA.VIEWS v ON v.TABLE_CATALOG = isc.TABLE_CATALOG AND v.TABLE_SCHEMA = isc.TABLE_SCHEMA AND v.TABLE_NAME = isc.TABLE_NAME
        OUTER APPLY (
            SELECT TOP 1 (1) AS Keyed
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                     INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu ON 
                        kcu.CONSTRAINT_CATALOG = tc.CONSTRAINT_CATALOG 
                        AND kcu.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA 
                        AND kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME 
                        AND kcu.TABLE_CATALOG = isc.TABLE_CATALOG 
                        AND kcu.TABLE_SCHEMA = isc.TABLE_SCHEMA 
                        AND kcu.TABLE_NAME = isc.TABLE_NAME 
                        AND kcu.COLUMN_NAME = isc.COLUMN_NAME
                WHERE 
                    tc.CONSTRAINT_TYPE = 'PRIMARY KEY' --'UNIQUE', 'FOREIGN KEY'
        ) con
    WHERE
        (@views = 1 OR v.TABLE_NAME IS NULL)
        AND (@tables = 1 OR v.TABLE_NAME IS NOT NULL)
        AND (
            UPPER(isc.TABLE_NAME) = UPPER(@resource)
            OR UPPER(isc.TABLE_SCHEMA + '.' + isc.TABLE_NAME) = UPPER(@resource)
            OR UPPER(isc.TABLE_CATALOG + '.' + isc.TABLE_SCHEMA + '.' + isc.TABLE_NAME) = UPPER(@resource)
            OR UPPER('[' + isc.TABLE_SCHEMA + ']' + '.' + '[' + isc.TABLE_NAME + ']') = UPPER(@resource)
            OR UPPER('[' + isc.TABLE_CATALOG + ']' + '.' + '[' + isc.TABLE_SCHEMA + ']' + '.' + '[' + isc.TABLE_NAME + ']') = UPPER(@resource)
            OR UPPER(isc.TABLE_SCHEMA + '.' + '[' + isc.TABLE_NAME + ']') = UPPER(@resource)
            OR UPPER(isc.TABLE_CATALOG + '.' + isc.TABLE_SCHEMA + '.' + '[' + isc.TABLE_NAME + ']') = UPPER(@resource)
        )
    ORDER BY isc.TABLE_CATALOG, isc.TABLE_SCHEMA, isc.TABLE_NAME, isc.ORDINAL_POSITION;