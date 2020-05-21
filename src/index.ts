import fs from 'fs'
import readline from 'readline'

// tslint:disable-next-line: no-console
const logger = console.log

interface IColRef {
  table: string
  col: string
}

interface ITableColumn {
  name: string
  isPk: boolean
  isFK: boolean
  'NOT NULL'?: boolean
  ref?: IColRef
  type?: string
  enum?: string,
  default?: string
  unique?: boolean
  AUTO_INCREMENT?: boolean
}

interface ITableObject {
  name: string
  pkList: string[]
  columns: {
    [key: string]: ITableColumn;
  }
}

interface IUML {
  tables: {
    [key: string]: ITableObject
  },
  enum: {
    [key: string]: string[]
  }
}

function relationTablesExists(ref: IColRef, columnName:string, tableName: string, uml: IUML) {
  if (!uml.tables[ref.table]) {
    logger(`The \x1b[1m${ref.table}.${ref.col}\x1b[0m on table \x1b[1m${tableName}\x1b[0m column \x1b[1m${columnName}\x1b[0m reference is incorrect, table \x1b[1m${ref.table}\x1b[0m doesn't exists`)
    return false
  }
  if (!uml.tables[ref.table].columns[ref.col]) {
    logger(`The \x1b[1m${ref.table}.${ref.col}\x1b[0m on table \x1b[1m${tableName}\x1b[0m column \x1b[1m${columnName}\x1b[0m reference is incorrect, column \x1b[1m${ref.col}\x1b[0m on table \x1b[1m${ref.table}\x1b[0m doesn't exists`)
    return false
  }
  return true
}

function getType(ref: IColRef, uml: IUML) {
  return uml.tables[ref.table].columns[ref.col].type
}

function getDefaultValue(columnData: ITableColumn) {
  const columnType = columnData.type
  return columnData.default
    ? columnType &&
        (((columnType.indexOf('INT') >= 0 ||
          columnType.startsWith('DOUBLE') ||
          columnType.startsWith('FLOAT') ||
          columnType.startsWith('DECIMAL') ||
          columnType === 'DATE' ||
          columnType === 'TIMESTAMP') &&
          ' DEFAULT ' + columnData.default) ||
          (columnType === 'BOOLEAN' &&
            ' DEFAULT ' + (columnData.default === 'true' ? 1 : 0)) ||
          " DEFAULT '" + columnData.default + "'")
    : ''
}

function defaultTableObject (name: string): ITableObject {
  return {
    pkList: [],
    name,
    columns: {},
  }
}

function UMLToMySQL(uml: IUML) {
  let createStatement = ''
  const tables = Object.values(uml.tables)
  const foreignKeys: string[] = []
  tables.forEach((table) => {
    const uniqueIndexes: string[] = []
    const columnLines: string[] = []
    const columns = Object.values(table.columns)

    createStatement += `\nCREATE TABLE IF NOT EXISTS ${table.name} (`

    columns.forEach((column) => {
      if (column.enum && uml.enum) {
        if (!uml.enum[column.enum]) {
          logger(`Missing declaration for enum: \x1b[1m${column.enum}\x1b[0m`)
          return
        }
        column.type = `ENUM('${uml.enum[column.enum].join("', '")}')`
      }
      if (column.ref) {
        if (!relationTablesExists(column.ref, column.name, table.name, uml)) {
          return
        }
        column.type = getType(column.ref, uml)
        foreignKeys.push(
          `ALTER TABLE ${table.name} ADD CONSTRAINT fk_${table.name}_${column.name} FOREIGN KEY (${column.name}) REFERENCES ${column.ref.table}(${column.ref.col})`
        )
      }
      if (column.unique) {
        uniqueIndexes.push(
          `UNIQUE KEY \`idx_${table.name}_${column.name}\` (${column.name})`
        )
      }
      columnLines.push(
        `\`${column.name}\` ${column.type}${getDefaultValue(column)}${
          (column.AUTO_INCREMENT && ' AUTO_INCREMENT') || ''
        }`
      )
    })

    createStatement += `\n${columnLines.join(',\n')}`

    if (table.pkList.length) {
      createStatement += `,\nPRIMARY KEY (${table.pkList.join(',')})`
    }
    if (uniqueIndexes.length) {
      createStatement += `,\n${uniqueIndexes.join(',\n')}`
    }
    createStatement += `\n)  ENGINE=INNODB;\n`
  })

  if (foreignKeys.length) {
    createStatement += '\n' + foreignKeys.join(';\n') + ';\n'
  }

  return createStatement
}

export default function parseFile(filePath: string) {
  const convertPlantumlToUML = new Promise<IUML>((res, rej) => {
    let isUML = false
    let isTable = false
    let nameENUM = ''
    let currentTableObject: ITableObject
    let currentColumn: ITableColumn
    const JSONUML: IUML = {
      tables: {},
      enum: {},
    }

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
    })

    rl.on('line', (input) => {
      input = input.trim()
      if (!isUML && input.startsWith('@startuml')) {
        isUML = true
        return
      }
      if (isUML) {
        if (!isTable && input.startsWith('class')) {
          isTable = true
          const tableName = input.split(' ')[1]
          if (JSONUML.tables[tableName]) {
            isTable = false
            logger(`Duplicate declaration for table: \x1b[1m${tableName}\x1b[0m`)
            return
          }
          currentTableObject = defaultTableObject(tableName)
          JSONUML.tables[tableName] = currentTableObject
          return
        } else if (isTable && input !== '}') {
          input.split(' ').forEach((columnData, index) => {
            let colName = columnData
            if (index === 0) {
              if (columnData[0] === '#' || columnData[0] === '+') {
                colName = columnData.substr(1)
                currentTableObject.pkList.push(colName)
                currentColumn = {
                  name: colName,
                  isPk: true,
                  isFK: columnData[0] === '+',
                }
              } else if (columnData === '..') {
                return
              } else {
                if (columnData[0] === '-') {
                  colName = columnData.substr(1)
                }
                currentColumn = {
                  name: colName,
                  isPk: false,
                  isFK: true,
                }
              }
              currentTableObject.columns[colName] = currentColumn
            } else if (columnData === 'NN') {
              currentColumn['NOT NULL'] = true
            } else if (columnData === 'AUTO_INCREMENT') {
              currentColumn.AUTO_INCREMENT = true
            } else if (columnData === 'UNIQUE') {
              currentColumn.unique = true
            } else if (columnData.startsWith('REF(')) {
              const ref = columnData.slice(4, -1).split('.')
              currentColumn.ref = {
                table: ref[0],
                col: ref[1],
              }
            } else if (columnData.startsWith('DEFAULT(')) {
              currentColumn.default = columnData.slice(8, -1)
            } else {
              if (!currentColumn.type && index === 1) {
                if (columnData.startsWith('ENUM(')) {
                  currentColumn.enum = columnData.slice(5, -1)
                }
                currentColumn.type = columnData
              } else {
                logger(`Unable to process parameter \x1b[1m${columnData}\x1b[0m
if it's a data type it should be the second item on the column definition` )
              }
            }
          })
        } else if (!nameENUM && input.startsWith('enum')) {
          nameENUM = input.split(' ')[1]
          if (JSONUML.enum[nameENUM]) {
            logger(`Duplicate declaration for enum: \x1b[1m${nameENUM}\x1b[0m`)
            nameENUM = ''
            return
          }
          JSONUML.enum[nameENUM] = []
          return
        } else if (nameENUM && input !== '}') {
          JSONUML.enum[nameENUM].push(input.trim())
          return
        }
        else if (input === '}') {
          isTable = false
          nameENUM = ''
          return
        }
      }
    })

    rl.on('close', () => {
      res(JSONUML)
    })
  })

  return convertPlantumlToUML.then((uml) => UMLToMySQL(uml))
}
