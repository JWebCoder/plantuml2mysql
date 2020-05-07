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
  tableName: string
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

function UMLToMySQL(uml: IUML) {
  let createStatement = ''
  const tables = Object.keys(uml)
  tables.forEach((tableName) => {
    const foreignKeys: string[] = []
    const primaryKeys: string[] = []
    const uniqueIndexes: string[] = []
    const columnLines: string[] = []
    const columns = Object.values(uml[tableName].columns)

    createStatement += `\nCREATE TABLE IF NOT EXISTS ${tableName} (`

    columns.forEach((column) => {
      if (column.ref) {
        column.type = getType(column.ref, uml)
        foreignKeys.push(
          `FOREIGN KEY (${column.name}) REFERENCES ${column.ref.table}(${column.ref.col})`
        )
      }
      if (column.isPk) {
        primaryKeys.push(column.name)
      }
      if (column.unique) {
        uniqueIndexes.push(
          `UNIQUE KEY \`idx_${tableName}_${column.name}\` (${column.name})`
        )
      }
      columnLines.push(
        `${column.name} ${column.type}${getDefaultValue(column)}${
          (column.AUTO_INCREMENT && ' AUTO_INCREMENT') || ''
        }`
      )
    })

    createStatement += `\n${columnLines.join(',\n')}`

    if (primaryKeys.length) {
      createStatement += `,\nPRIMARY KEY (${primaryKeys.join(',')})`
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
      if (!isUML && input.startsWith('@startuml')) {
        isUML = true
        return
      }
      if (isUML) {
        input = input.trim()

        if (!isTable && input.startsWith('class')) {
          isTable = true
          const tableName = input.split(' ')[1]
          currentTableObject = {
            pkList: [],
            tableName,
            columns: {},
          }
          JSONUML[tableName] = currentTableObject
          return
        }

        if (isTable && input !== '}') {
          const tableColData = input.split(' ')
          tableColData.forEach((colData, index) => {
            let colName = colData
            if (index === 0) {
              if (colData[0] === '#' || colData[0] === '+') {
                colName = colData.substr(1)
                currentTableObject.pkList.push(colName)
                currentColumn = {
                  name: colName,
                  isPk: true,
                }
              } else if (colData === '..') {
                return
              } else {
                if (colData[0] === '-') {
                  colName = colData.substr(1)
                }
                currentColumn = {
                  name: colName,
                  isPk: false,
                }
              }
              currentTableObject.columns[colName] = currentColumn
            } else if (colData === 'NN') {
              currentColumn['NOT NULL'] = true
            } else if (colData === 'AUTO_INCREMENT') {
              currentColumn.AUTO_INCREMENT = true
            } else if (colData === 'UNIQUE') {
              currentColumn.unique = true
            } else if (colData.startsWith('REF(')) {
              const ref = colData.slice(4, -1).split('.')
              currentColumn.ref = {
                table: ref[0].charAt(0).toUpperCase() + ref[0].slice(1),
                col: ref[1],
              }
            } else if (colData.startsWith('DEFAULT(')) {
              currentColumn.default = colData.slice(8, -1)
            } else {
              currentColumn.type = colData
            }
          })
        } else if (isTable && input === '}') {
          isTable = false
        }
      }
    })

    rl.on('error', (reason) => {
      return rej(reason)
    })

    rl.on('close', () => {
      res(JSONUML)
    })
  })

  return convertPlantumlToUML.then((uml) => UMLToMySQL(uml))
}
