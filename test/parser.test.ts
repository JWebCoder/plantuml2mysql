import parseFile from '../src/index'
import path from 'path'
import wantedFullDatabase from './wantedFullDatabase'
import wantedDuplicatedENUM from './wantedDuplicatedENUM'
import wantedMissingENUM from './wantedMissingENUM'
import wantedDuplicatedTable from './wantedDuplicatedTable'

import debug from 'debug'

debug.enable('verbose')

describe('Parser tests', () => {

  it('it should parse the file line by line', (done) => {
    parseFile(path.join(__dirname, 'database.md')).then(
      (result) => {
        expect(result).toEqual(wantedFullDatabase)
        done()
      }
    )
  })

  it('it should ignore the duplicated table', (done) => {
    parseFile(path.join(__dirname, 'duplicateTable.md')).then(
      (result) => {
        expect(result).toEqual(wantedDuplicatedTable)
        done()
      }
    )
  })

  it('it should ignore field with missing enum declaration', (done) => {
    parseFile(path.join(__dirname, 'missingEnum.md')).then(
      (result) => {
        expect(result).toEqual(wantedMissingENUM)
        done()
      }
    )
  })

  it('it should ignore the duplicated enum', (done) => {
    parseFile(path.join(__dirname, 'duplicateENUM.md')).then(
      (result) => {
        expect(result).toEqual(wantedDuplicatedENUM)
        done()
      }
    )
  })
})
