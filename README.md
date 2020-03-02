# HTML解析器

解析HTML为dom树

## 使用

```typescript
//导入库
import { HTMLParser } from 'yizhi-html-parser'
//创建解析器
const parser = new HTMLParser('<div>xxxxxxx</div>')
//解析之后得到一个文档
const result = parser.parse()
```