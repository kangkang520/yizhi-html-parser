import { HTMLObject, Element, TextNode, Comment, Document } from "./objects"
import { selfCloseingTags } from "./self-closing"


/**
 * HTML解析选项
 */
export interface IHTMLParserOption {
	/** 文件位置 */
	filename?: string
	/** 自定义的自动关闭标签 */
	autoCloseTags?: Array<string>
	/** 
	 * 当使用自定义的自动关闭标签时，是否覆盖系统定义的自动关闭标签
	 * * `true` 此时，如果设置了autoCloseTags，则进行覆盖，否则忽略
	 * * `false` 此时，如果设置了autoCloseTags，则将和系统定义的标签取并集
	 * */
	coverSystemAutoCloseTags?: boolean
	//
}

/** 
 * html解析器
 */
export class HTMLParser {

	//自动关闭的标签
	private autoCloseTags: Array<string>

	private document: Document
	//位置
	private index = 0
	//当前元素
	private current: HTMLObject

	/** HTML文档内容 */
	public readonly content: string

	/** 转换选项 */
	public readonly option: IHTMLParserOption

	constructor(content: string, option?: IHTMLParserOption) {
		this.content = content
		const opt = this.option = option || {}
		this.current = this.document = new Document()
		this.autoCloseTags = [
			...selfCloseingTags,
			...(opt.coverSystemAutoCloseTags && opt.autoCloseTags) ? opt.autoCloseTags : []
		]
	}

	/**
	 * 开始解析
	 */
	public parse() {
		//读取HTML
		this.read()
		//返回读取到的文档
		return this.document
	}

	//下一步（可以多步）
	private next(s = 1) {
		this.index += s
	}

	//当前字符串
	private ch(n = 0) {
		return this.content[this.index + n]
	}

	//正则表达式验证目前字符串
	private test(regext: RegExp, n = 0, maxLen = 20) {
		const subs = this.content.substr(this.index + n, maxLen)
		return regext.test(subs)
	}

	//检测字符是否为空白
	private white(c: string) {
		return c == ' ' || c == '\t' || c == '\n' || c == '\r'
	}

	//获取带处理的字符在调试时会用到它，用来观察即将处理的字符串
	private get todo() {
		return this.content.substr(this.index)
	}

	//读取文档，用于检测元素类型并发起相关调用
	private read() {
		while (true) {
			const c = this.ch()
			if (!c) break
			//如果遇到左尖括号
			if (c == '<') {
				//如果遇到感叹号表示要读取文档类型或注释
				if (this.ch(1) == '!') {
					//读取注释
					if (this.ch(2) == '-' && this.ch(3) == '-') this.readComment()
					//读取文档类型
					else if (this.test(/^<!DOCTYPE /i)) this.readDoctype()
					//否则按照文本处理
					else this.readNode()
				}
				//否则读取标签
				else this.readElement()
			}
			//否则读取节点
			else this.readNode()
		}
	}

	//读取字符串
	private readString(tag: string) {
		//跳过开头
		this.next()
		let start = this.index
		//读取
		while (true) {
			const c = this.ch()
			if (!c) break
			//结束了
			if (c == tag) {
				const str = this.content.substring(start, this.index)
				this.next()
				return str
			}
			//读取到转义字符串
			if (c == '\\') {
				this.next(2)
			}
			else this.next()
		}
		//文档异常结束
	}

	//读取文档类型
	private readDoctype() {
		//记录开始位置
		const start = this.index
		//跳过开头
		this.next(`<!DOCTYPE `.length)
		//继续读取
		while (true) {
			const c = this.ch()
			if (!c) break
			//完成
			if (c == '>') {
				this.next()
				//得到内容
				this.document.doctype = this.content.substring(start, this.index)
				break
			}
			else if (c == '"' || c == "'") this.readString(c)
			else this.next()
		}
	}

	//读取元素
	private readElement() {
		//跳过开始的<
		this.next()
		//如果有空白跳过它
		this.skipWhite()
		//检测是不是结束
		if (this.ch() == '/') {
			//跳过斜杠
			this.next()
			this.skipWhite()
			//读取元素名称
			const start = this.index
			let name = ''
			while (true) {
				const c = this.ch()
				if (this.white(c) || c == '>') {
					if (!name) name = this.content.substring(start, this.index)
					if (c == '>') {
						//跳过尖括号
						this.next()
						break
					}
				}
				else this.next()
			}
			//处理名称，自动关闭的标签不做处理
			if (!this.autoCloseTags.includes(name)) {
				//回到上一级元素
				if (this.current.parent) this.current = this.current.parent
			}
		}
		else {
			//读取名称
			let start = this.index
			let name = ''
			while (true) {
				const c = this.ch()
				//如果没有了，则直接忽略
				if (!c) return
				//如果遇到空格或>表示结束
				if (this.white(c) || c == '>') {
					name = this.content.substring(start, this.index)
					//跳过空白
					if (this.white(c)) this.skipWhite()
					break
				}
				else this.next()
			}
			if (!name) return
			//生成元素
			const elem = new Element(name)
			//读取属性
			let attrName = ''			//属性名
			let attrVal: string | boolean = true	//属性值
			let getEQ = false			//是否遇到了等号
			while (true) {
				const c = this.ch()
				//如果异常结束则直接退出了
				if (!c) return
				//如果遇到空格或>表示读取完毕
				if (this.white(c) || c == '>' || c == '/') {
					this.skipWhite()
					//先检测后面是不是有等号
					if (this.ch() == '=') continue
					//如果没有等号，说明属性结束，保存ta
					//保存
					if (attrName) elem.addAttr(attrName, attrVal)
					//重置
					attrName = ''
					attrVal = true
					getEQ = false
					//如果遇到的是>或/则结束了
					if (!this.white(c)) break
				}
				//如果遇到等号则标记getEQ为true
				else if (c == '=') {
					getEQ = true
					//跳过等号
					this.next()
					//忽略等号好眠的空白
					this.skipWhite()
				}
				//如果已经在等号后面了，则赋值给具体的值
				else if (getEQ) {
					if (typeof attrVal == 'boolean') attrVal = ''
					if (c == '"' || c == "'") {
						attrVal = this.readString(c) || ''
					}
					else {
						attrVal += c
						this.next()
					}
				}
				//如果在等号前面则赋值给名称
				else {
					attrName += c
					this.next()
				}
			}
			//保存元素
			this.current.addChild(elem)
			//结尾工作处理
			this.skipWhite()
			{
				const c = this.ch()
				//自关闭了，再读一个字符退出
				if (c == '/') {
					elem.selfClose = true
					//跳过斜杠
					this.next()
					//可能有空白，先读取完毕
					this.skipWhite()
					//如果最后一个字符是结束则读取
					if (this.ch() == '>') {
						this.next()
					}
					//否则就不处理了
					else return
				}
				//如果遇到结束符号
				else if (c == '>') {
					//先跳过尖括号
					this.next()
					//检测标签是不是自动关闭的
					if (this.autoCloseTags.includes(name)) {
						//标识为自动关闭
						elem.autoClose = true
					}
					//否则继续读取，同时设置当前标签为正在解析的标签
					else {
						//设置当前元素
						this.current = elem
						//读取内部元素
						this.read()
					}
				}
				//其他退出（一般这步不会来）
				else return
			}
		}
	}

	//读取节点
	private readNode() {
		//检测当前标签是不是script或style标签
		if ((this.current instanceof Element) && (this.current.name == 'script' || this.current.name == 'style')) return this.readCodeText(this.current.name)
		//记录开始
		const start = this.index
		//开始读取
		while (true) {
			const c = this.ch()
			//文本结束
			if (!c || c == '<') {
				const node = new TextNode(this.content.substring(start, this.index))
				this.current.addChild(node)
				break
			}
			else this.next()
		}
	}

	//读取代码文本（如script和style中的）的内容
	private readCodeText(tagName: string) {
		let start = this.index
		while (true) {
			const c = this.ch()
			if (!c) return
			//如果遇到结束符则退出
			if (c == '<' && this.test(new RegExp(`^<\/${tagName}>`, 'i'))) {
				const script = this.content.substring(start, this.index)
				const node = new TextNode(script)
				this.current.addChild(node)
				break
			}
			//过滤正则表达式或注释(/xxx/ /**/ //)（要注意的是有可能是除法运算）
			else if (c == '/') {
				//处理多行注释(js和css都是支持的)
				if (this.ch(1) == '*') this.readTextMultLineComment()
				//如果是js则过滤单行注释和正则表达式
				else if (tagName == 'script') {
					//单行注释
					if (this.ch(1) == '/') this.readJSOneLineComment()
					//否则需要检测是不是正则表达式，
					//往以前的字符中查找，
					//		如果遇到“(”则是正则表达式
					//		如果遇到“=”则是正则表达式
					//		如果遇到“;”则是正则表达式
					else {
						//检测是不是正则表达式
						let isReg: boolean = false
						for (let i = this.index - 1; i >= 0; i--) {
							const c = this.content[i]
							//忽略空白
							if (this.white(c)) continue
							//遇到了非空字符，检测一下
							isReg = c == '(' || c == '=' || c == ';'
							break
						}
						//如果是则处理
						if (isReg) this.readJSRegexp()
						//否则跳过就玩
						else this.next()
					}
				}
				//其他的不管了
				else this.next()
			}
			//读取字符串
			else if (c == '"' || c == "'" || c == '`') {
				this.readString(c)
			}
			//其他不管
			else this.next()
		}
	}

	//读取js的正则表达式 /xxx/
	private readJSRegexp() {
		//跳过当前字符（正则表达式开始字符/）
		this.next()
		//逐个读取，直到遇见/
		while (true) {
			const c = this.ch()
			//正则表达式结束
			if (c == '/') {
				//读取完该字符后结束
				this.next()
				break
			}
			//转义字符串处理，跳过两个字符即可
			else if (c == '\\') this.next(2)
			//其他的直接跳过
			else this.next()
		}
	}

	//读取js的单行注释
	private readJSOneLineComment() {
		//跳过开头的两个斜杠
		this.next(2)
		//一直读取，知道遇到换行为止
		while (true) {
			const c = this.ch()
			//异常结束不做处理
			if (!c) return
			//读取完换行后结束
			else if (c == '\n') {
				this.next()
				break
			}
			//接着读取
			else this.next()
		}
	}

	//读取文本中的多行注释
	private readTextMultLineComment() {
		//跳过开头的/*
		this.next(2)
		//一直读取，知道遇到结束位置
		while (true) {
			const c = this.ch()
			//异常结束，不做处理
			if (!c) return
			//如果遇到结束，读取完结束符退出
			else if (c == '*' && this.ch(1) == '/') {
				this.next(2)
				break
			}
			//否则一直读取
			else this.next()
		}
	}

	//读取注释
	private readComment() {
		//跳过开头
		this.next('<!--'.length)
		this.skipWhite()
		const start = this.index
		while (true) {
			const c = this.ch()
			if (!c) break
			//遇到-->表示注释结束
			if (c == '-' && this.ch(1) == '-' && this.ch(2) == '>') {
				//保存注释
				const str = this.content.substring(start, this.index).trim()
				const cmt = new Comment(str)
				this.current.addChild(cmt)
				//跳过结尾
				this.next('-->'.length)
				//退出
				return
			}
			else this.next()
		}
	}

	//跳过空白
	private skipWhite() {
		while (true) {
			let c = this.ch()
			if (c == ' ' || c == '\t' || c == '\r' || c == '\n') this.next()
			else break
		}
	}
}