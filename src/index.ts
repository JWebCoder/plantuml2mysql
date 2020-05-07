import fs from 'fs'
import readline from 'readline'

interface IColRef {
  table: string
  col: string
}

interface ITableColumn {
  name: string
  isPk?: boolean
  'NOT NULL'?: boolean
  ref?: IColRef
  type?: string
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
  [key: string]: ITableObject
}

function getType(ref: IColRef, uml: IUML) {
  return uml[ref.table].columns[ref.col].type
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
  const tables = Object.values(uml)
  tables.forEach((table) => {
    const foreignKeys: string[] = []
    const uniqueIndexes: string[] = []
    const columnLines: string[] = []
    const columns = Object.values(table.columns)

    createStatement += `\nCREATE TABLE IF NOT EXISTS ${table.name} (`

    columns.forEach((column) => {
      if (column.ref) {
        column.type = getType(column.ref, uml)
        foreignKeys.push(
          `FOREIGN KEY (${column.name}) REFERENCES ${column.ref.table}(${column.ref.col})`
        )
      }
      if (column.unique) {
        uniqueIndexes.push(
          `UNIQUE KEY \`idx_${table.name}_${column.name}\` (${column.name})`
        )
      }
      columnLines.push(
        `${column.name} ${column.type}${getDefaultValue(column)}${
          (column.AUTO_INCREMENT && ' AUTO_INCREMENT') || ''
        }`
      )
    })

    createStatement += `\n${columnLines.join(',\n')}`

    if (table.pkList.length) {
      createStatement += `,\nPRIMARY KEY (${table.pkList.join(',')})`
    }
    if (foreignKeys.length) {
      createStatement += `,\n${foreignKeys.join(',\n')}`
    }
    if (uniqueIndexes.length) {
      createStatement += `,\n${uniqueIndexes.join(',\n')}`
    }
    createStatement += `\n)  ENGINE=INNODB;\n`
  })

  return createStatement
}

export default function parseFile(filePath: string) {
  const convertPlantumlToUML = new Promise<IUML>((res, rej) => {
    let isUML = false
    let isTable = false
    let currentTableObject: ITableObject
    let currentColumn: ITableColumn
    const JSONUML: IUML = {}

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
          currentTableObject = defaultTableObject(tableName)
          JSONUML[tableName] = currentTableObject
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
                table: ref[0].charAt(0).toUpperCase() + ref[0].slice(1),
                col: ref[1],
              }
            } else if (columnData.startsWith('DEFAULT(')) {
              currentColumn.default = columnData.slice(8, -1)
            } else {
              currentColumn.type = columnData
            }
          })
        } else if (isTable && input === '}') {
          isTable = false
        }
      }
    })

    rl.on('close', () => {
      res(JSONUML)
    })
  })

  return convertPlantumlToUML.then((uml) => UMLToMySQL(uml))
}
