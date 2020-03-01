import { HTMLParser } from '../src'
import fs from 'fs'
import path from 'path'


const content = fs.readFileSync(path.join(__dirname, 'test.html')) + ''
const parser = new HTMLParser(content, { filename: 'test.html' })
parser.parse()

setInterval(() => 0, 10000000)