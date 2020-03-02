interface IAttr {
	name: string
	value: string | boolean
}

/** 
 * HTML对象
 * 
 * 此对象定义了元素的基本操作
 */
export abstract class HTMLObject {
	/** 子元素 */
	public readonly children: Array<HTMLObject> = []
	/** 上级元素 */
	public parent: HTMLObject | null = null

	/**
	 * 添加孩子
	 * @param child 孩子元素
	 */
	public addChild(child: HTMLObject) {
		child.parent = this
		this.children.push(child)
	}
}

/**
 * HTML元素类
 * 
 * 此类用于保存HTML标签
 */
export class Element extends HTMLObject {

	//属性列表
	private _attrs: Array<IAttr> = []

	/** 元素名称 */
	public readonly name: string

	/** 是不是自己关闭的 */
	public selfClose: boolean = false

	/** 是不是自动关闭的 */
	public autoClose: boolean = false

	constructor(name: string) {
		super()
		this.name = name
	}

	/**
	 * 添加属性
	 * @param attr 属性
	 */
	public addAttr(name: string, val: string | boolean) {
		this._attrs.push({ name, value: val })
	}

	/** 属性列表 */
	public attrs() {
		return this._attrs
	}
}

/**
 * HTML文本节点
 * 
 * 此类用于存放文本内容，包括换行之类的
 */
export class TextNode extends HTMLObject {
	public readonly text: string

	constructor(text: string) {
		super()
		this.text = text
	}
}

/**
 * 此类用于定义注释
 */
export class Comment extends HTMLObject {
	/** 注释内容 */
	public readonly text: string

	constructor(text: string) {
		super()
		this.text = text
	}
}

/**
 * 此类用于定义HTML文档
 */
export class Document extends HTMLObject {
	public doctype: string = ''
}