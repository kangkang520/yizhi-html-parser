import { HTMLParser } from '../src'
import fs from 'fs'
import path from 'path'


const content = fs.readFileSync(path.join(__dirname, 'test.html')) + ''
const parser = new HTMLParser(content, { filename: 'test.html' })
const result = parser.parse()
debugger
console.log(result)

//一直运行着方便调试
setInterval(() => 0, 10000000)