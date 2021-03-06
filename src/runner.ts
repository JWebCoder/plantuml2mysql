#!/usr/bin/env node

import plantuml2mysql from './'
import path from 'path'
import fs from 'fs'

plantuml2mysql(path.join(process.cwd(), process.argv[2])).then(
  (result) => {
    fs.writeFileSync(path.join(process.cwd(), process.argv[3] || 'database.sql'), result)
  }
)