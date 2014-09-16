/**
 * @author bh-lay
 * 
 * @github https://github.com/bh-lay/UI
 * @modified requires('Date')
 * 
 **/

(function(global,doc,UI_factory,utils_factory){
	
	//初始化工具类
	var utils = utils_factory(global,doc);
	
	//初始化UI模块
	var UI = UI_factory(global,doc,utils);
	
	//提供window.UI的接口
	global.UI = global.UI || UI;
	global.UI._utils = utils;
	
	//提供CommonJS规范的接口
	global.define && define(function(){
		return UI;
	});
})(window,document,function(window,document,utils){
	/**
	 * 缓存utils下常用工具
	 *   为压缩变量名做准备
	 */
	var isNum = utils.isNum,
		setCSS = utils.css,
		getCSS = utils.getStyle,
		animation = utils.animation,
		outerWidth = utils.outerWidth,
		outerHeight = utils.outerHeight,
		findByClassName = utils.findByClassName;
	
	/**
	 * 基础模版
	 */
	var allCnt_tpl = requires('template/base.html');
	var pop_tpl = requires('template/pop.html');
	var confirm_tpl = requires('template/confirm.html');
	var ask_tpl = requires('template/ask.html');
	var confirmBar_tpl = requires('template/confirmBar.html');
	var plane_tpl = requires('template/plane.html');
	var prompt_tpl = requires('template/prompt.html');
	var cover_tpl = requires('template/cover.html');
	var select_tpl = requires('template/select.html');
	
	var popCSS = requires('style.css');
	
	var isIE67 = false;
	if(navigator.appName == "Microsoft Internet Explorer"){
		var version = navigator.appVersion.split(";")[1].replace(/[ ]/g,"");
		if(version == "MSIE6.0" || version == "MSIE7.0"){
			isIE67 = true; 
		}
	}
	
	/**
	 * 定义私有变量
	 * 
	 **/ 
	var private_allCnt = utils.createDom(allCnt_tpl)[0],
		private_maskDom = findByClassName(private_allCnt,'UI_mask')[0],
		private_mainDom = findByClassName(private_allCnt,'UI_main_cnt')[0],
		private_fixedScreenBottomDom = findByClassName(private_allCnt,'UI_fixedScreenBottom_cnt')[0],
		private_cssDom = null,
		private_body = document.body,
		private_docW,
		private_winH,
		private_docH,
		private_scrollTop,
		private_maskCount = 0;

	var private_CONFIG = {
		gap : {
			top : 0,
			left : 0,
			bottom : 0,
			right : 0
		},
		zIndex : 499
	};
	
	var docDom;
	if (document.compatMode == "BackCompat") {
		docDom = private_body;
	}else{
		//"CSS1Compat"
		docDom = document.documentElement;
	}
	function refreshSize(){
		//重新计算窗口尺寸
		private_scrollTop = document.documentElement.scrollTop == 0 ? private_body.scrollTop : document.documentElement.scrollTop;
		private_winH = window.innerHeight || document.documentElement.clientHeight;
		private_docH = docDom.scrollHeight;
		private_docW = docDom.clientWidth;
		
		//向css环境写入动态css
		private_cssDom && utils.removeNode(private_cssDom);
		var styleStr = [
			'.UI_cover{height:' + private_winH + 'px;max-height:' + private_winH + 'px;}',
			'.UI_ask{top:' + (private_winH/2) + 'px;}'
		].join('');
		private_cssDom = utils.createStyleSheet(styleStr,{'data-module' : "UI_plug"});
	}
	
	
	//初始化组件基础功能
//	utils.ready(function(){
		//插入css样式表
		var styleSheet = utils.createStyleSheet(popCSS,{'data-module' : "UI"});
		
		//插入基础dom
		private_body.appendChild(private_allCnt);
		
		//释放掉无用的内存
		popCSS = null;
		allCnt_tpl = null;
		
		//更新窗口尺寸
		refreshSize();
		setTimeout(refreshSize,500);
		
		var rebuild_fn = null;
		if(isIE67){
			setCSS(private_fixedScreenBottomDom,{
				top : private_scrollTop + private_winH*2
			});
			
			rebuild_fn = function(){
				refreshSize();
				setCSS(private_fixedScreenBottomDom,{
					top : private_scrollTop + private_winH*2
				});
				setCSS(private_maskDom,{
					'marginTop' : private_scrollTop
				});
			};
		}else{
			setCSS(private_fixedScreenBottomDom,{
				position : 'fixed',
				bottom : 0
			});
			setCSS(private_maskDom,{
				'position' : 'fixed',
				'top' : 0
			});
			rebuild_fn = refreshSize;
		}
		
		//监听浏览器缩放、滚屏事件
		utils.bind(window,'resize',rebuild_fn);
		utils.bind(window,'scroll',rebuild_fn);
//	});
	
	//限制位置区域的方法
	function fix_position(top,left,width,height){
		var gap = private_CONFIG.gap;
		if(top<private_scrollTop + gap.top){
			//屏幕上方
			top = private_scrollTop  + gap.top;
		}else if(top + height - private_scrollTop > private_winH - gap.bottom) {
			//屏幕下方
			if(height > private_winH - gap.top - gap.bottom){
				//比屏幕高
				top = private_scrollTop + gap.top;
			}else{
				//比屏幕矮
				top = private_scrollTop + private_winH - height - gap.bottom;
			}
		}
		if(left < gap.left){
			left =  gap.left;
		}else if(left + width > private_docW - gap.right){
			left = private_docW - width - gap.right;
		}
		
		return {
			top : top,
			left : left
		}
	}
	//计算自适应页面位置的方法
	function adaption(width,height){
		var top = (private_winH - height)/2 + private_scrollTop;
		var left = (private_docW - width)/2;
		
		var gap = private_CONFIG.gap;
		var screenTop = (private_winH - height)/2;
		if(screenTop < gap.top){
			screenTop = gap.top;
		}
		
		var newPosition = fix_position(top,left,width,height);
		return {
			top : newPosition.top,
			left : newPosition.left,
			screenTop : screenTop,
			screenLeft : newPosition.left
		}
	}
	
	//增加确认方法
	function add_confirm(dom,param,close){
		var callback = null;
		var cancel = null;
		var btns = ['\u786E\u8BA4','\u53D6\u6D88'];
		if(typeof(param) == "function"){
			callback = param;
		}else if(typeof(param) == "object"){
			var paramBtns = param.btns || [];
			btns[0] = paramBtns[0] || btns[0];
			btns[1] = paramBtns[1] || btns[1];
			if(typeof(param.callback) == "function"){
				callback = param.callback;
			}
			if(typeof(param.cancel) == "function"){
				cancel = param.cancel;
			}
		}
		var this_html = utils.render(confirmBar_tpl,{
			confirm : btns[0],
			cancel : btns[1]
		});
		dom.appendChild(utils.createDom(this_html)[0]);
		
		//绑定事件，根据执行结果判断是否要关闭弹框
		utils.bind(dom,'click','.UI_pop_confirm_ok',function(){
			//点击确认按钮
			callback ? ((callback() != false) && close()) : close();
		});
		utils.bind(dom,'click','.UI_pop_confirm_cancel',function(){
			//点击取消按钮
			cancel ? ((cancel() != false) && close()) : close();
		});
	}
	
	/**
	 * 处理对象是否易于关闭的扩展
	 *   点击自身以外的空间，按下esc键
	 */
	 //当前打开状态的对象
	private_active = [];
	
	function closeActive(){
		utils.each(private_active,function(i,item){
			item.close();
		});
		private_active = [];
	}
	//检测body的mouseup事件
	utils.bind(private_body,'mouseup',function checkClick(event) {
		setTimeout(function(){
			var target = event.srcElement || event.target;
			while (!utils.hasClass(target,'UI_easyClose')) {
				target = target.parentNode;
				if(!target){
					//close the active
					closeActive();
					break
				}
			}
		});
	});
	//检测window的keydown事件（esc）
	utils.bind(private_body,'keyup',function checkClick(event) {
		if(event.keyCode == 27){
			closeActive();
		}
	});
	
	/**
	 * 对象易于关闭方法拓展
	 *   mark 为当前参数
	 *   default_value 为默认参数
	 */
	function easyCloseHandle(mark,default_value){
		if(typeof(mark) == 'boolean' ? mark : default_value){
			var me = this;
			utils.addClass(this.dom,'UI_easyClose');
			setTimeout(function(){
				private_active.push(me);
			},20);
		}
	}
	
	
	/**
	 * 模糊效果
	 */
	function addRootElements(callback){
		var doms = private_body.childNodes;
		utils.each(doms,function(i,dom){
			if(dom != private_allCnt && dom.nodeType ==1 && dom.tagName != 'SCRIPT' && dom.tagName != 'LINK' && dom.tagName != 'STYLE'){
				callback(dom);
			}
		});
	}
	var blur = removeBlur = null;
	if(utils.supports('-webkit-filter')){
		blur = function (){
			addRootElements(function(dom){
				utils.addClass(dom,'UI-blur');
			});
		};
		removeBlur = function (){
			addRootElements(function(dom){
				utils.removeClass(dom,'UI-blur');
			});
		};
	}
	
	/**
	 * 显示蒙层 
	 */
	function showMask(mark,callback){
		if(!mark){
			callback && callback();
			return;
		}
		
		private_maskCount++
		if(private_maskCount==1){
			utils.fadeIn(private_maskDom,500,function(){
				callback && callback();
			});
			blur && blur();
		}else{
			callback && callback();
		}
	}
	/**
	 * 关闭蒙层
	 */
	function closeMask(mark){
		if(mark){
			private_maskCount--;
			if(private_maskCount == 0){
				removeBlur && removeBlur();
				utils.fadeOut(private_maskDom,400);
				
			}
		}
	}
	//在指定DOM后插入新DOM
	function insertAfter(newElement, targetElement){
		var parent = targetElement.parentNode;
		if (parent.lastChild == targetElement) {
			// 如果最后的节点是目标元素，则直接添加。因为默认是最后
			parent.appendChild(newElement);
		} else {
			//如果不是，则插入在目标元素的下一个兄弟节点 的前面。也就是目标元素的后面
			parent.insertBefore(newElement, targetElement.nextSibling);
		}
	}
	
	/**
	 * 计算动画所需的方向及目标值
	 *   @returns[0] 所需修改的方向
	 *   @returns[1] 当前方向的值
	 *   @returns[2] 计算后的值
	 */
	function countAnimation(DOM,direction,range){
		var prop,
			start,
			result;
		
		if(direction == 'left' || direction == 'right'){
			//判断dom水平定位依据
			var left = getCSS(DOM,'left');
			if(left != 'auto'){
				prop = 'left';
				start = left;
			}else{
				prop = 'right';
				start = getCSS(DOM,'right');
			}
		}else{
			//判断dom垂直定位依据
			var top = getCSS(DOM,'top');
			if(top != 'auto'){
				prop = 'top';
				start = top;
			}else{
				prop = 'bottom';
				start= getCSS(DOM,'bottom');
			}
		}
		result = (prop == direction) ? start + range : start - range;
		return [prop,start,result];
	}
	/**
	 * 开场动画
	 *   创建一个dom用来完成动画
	 *   动画结束，设置dom为结束样式
	 **/
	var openAnimation = isIE67 ? function openAnimation(a,b,c,d,fn){
		fn && fn();
	} : function openAnimation(DOM,from,time,animation_range,fn){
		if(!from || from == 'none'){
			fn && fn();
			//不需要动画
			return
		}
		var range = animation_range || 80;
		var offset = utils.offset(DOM);
		
		//动画第一帧css
		var cssStart = {},
			//动画需要改变的css
			cssAnim = {};
		
		//参数是dom对象
		if(from.tagName && from.parentNode){
			time = 200;
			var offset_from = utils.offset(from);
			cssStart = {
				top : offset_from.top,
				left : offset_from.left,
				width : outerWidth(from),
				height : outerHeight(from),
				overflow : 'hidden'
			};
			cssAnim = {
				width : getCSS(DOM,'width'),
				height : getCSS(DOM,'height'),
				top : getCSS(DOM,'top'),
				left : getCSS(DOM,'left')
			};
		//参数是字符串
		}else if(typeof(from) == 'string'){
			var countResult = countAnimation(DOM,from,-range);
			cssStart[countResult[0]] = countResult[2];
			cssAnim[countResult[0]] = countResult[1];
		}
		//拷贝dom用来完成动画
		var html = DOM.outerHTML;
		//FIXME 过滤iframe正则随便写的
		html = html.replace(/<iframe.+>\s*<\/iframe>/ig,'');
		var animDom = utils.createDom(html)[0];
		//为了效果跟流畅，隐藏内容部分
		var cntDom = utils.findByClassName(animDom,'UI_cnt')[0];
		insertAfter(animDom,DOM);
		if(cntDom){
			setCSS(cntDom,{
				'height' : outerHeight(cntDom)
			});
			cntDom.innerHTML = '';
		}
		
		
		//隐藏真实dom
		setCSS(DOM,{
			'display' : 'none'
		});
		
		//放置于初始位置
		cssStart.opacity = 0;
		setCSS(animDom,cssStart);
		//动画开始
		cssAnim.opacity = 1;
		animation(animDom,cssAnim,time,'SineEaseIn',function(){
			//删除动画dom
			utils.removeNode(animDom);
			//显示真实dom
			setCSS(DOM,{
				display : 'block'
			});
			fn && fn();
		});
	};
	/**
	 * 处理对象关闭及结束动画
	 */
	function closeAnimation(time_define,animation_range,fn){
		return function(time){
			var me = this;
			
			//检测、记录自己是否“活着”
			if(this.dead){
				return;
			}
			this.dead = true;
			
			
			var time = isNum(time) ? time : parseInt(time_define) || 80;
			var from = me._from;
			
			var range = animation_range || 80;
			
			//处理关闭回调、蒙层检测
			fn && fn.call(me);
			function endFn(){
				me.closeFn && me.closeFn();
				closeMask(me._mask);
			}
			
			
			var DOM = me.dom;
			var cssEnd = {
				'opacity' : 0
			};
			if(from && from.tagName && from.parentNode){
				utils.zoomOut(DOM,time,function(){
					utils.removeNode(DOM);
					endFn();
				});
			}else if(typeof(from) == 'string'){
				
				var countResult = countAnimation(DOM,from,-range);
				cssEnd[countResult[0]] = countResult[2];
				
				//动画开始
				animation(DOM,cssEnd,time,'SineEaseIn',function(){
					utils.removeNode(DOM);
					endFn();
				});
			}else{
				utils.removeNode(DOM);
				endFn();
			}
		}
	}
	
	/**
	 * 弹框
	 * pop 
	 */
	function POP(param){
		var param = param || {};
		var me = this;
		
		this.dom = utils.createDom(pop_tpl)[0];
		this.cntDom = findByClassName(this.dom,'UI_cnt')[0];
		this.closeFn = param.closeFn || null;
		this._mask = param.mask || false;
		this._from = param.from || 'top';
		

		//当有确认参数时
		if(param.confirm){
			add_confirm(this.dom,param.confirm,function(){
				me.close();
			});
		}
		//处理title参数
		var caption_dom = findByClassName(this.dom,'UI_pop_cpt')[0];
		if(!param.title){
			utils.removeNode(caption_dom);
		}else{
			var title = param.title || 'need title in parameter!';
			
			caption_dom.innerHTML = title;
			//can drag is pop
			utils.drag(caption_dom,this.dom,{
				start : function(){
					//更新窗口尺寸
					refreshSize();
				},
				move : function(mx,my,l_start,t_start,w_start,h_start){
					var left = mx + l_start;
					var top = my + t_start;
					
					var newSize = fix_position(top,left,w_start,h_start);
					setCSS(me.dom,{
						left : newSize.left,
						top : newSize.top
					});
				}
			});
		}
		
		utils.bind(this.dom,'click','.UI_pop_close',function(){
			me.close();
		});
		
		showMask(this._mask,function(){
			var this_width = Math.min(param.width || 600,private_docW-20);
			
			//插入内容
			me.cntDom.innerHTML = param.html || '';
			
			//设置宽度，为计算位置尺寸做准备
			setCSS(me.dom,{
				width : this_width
			});
			private_mainDom.appendChild(me.dom);
			
			//校正位置
			var fixSize = adaption(this_width,outerHeight(me.dom));
			var top = isNum(param.top) ? param.top : fixSize.top;
			var left = isNum(param.left) ? param.left : fixSize.left;
			setCSS(me.dom,{
				top : top,
				left : left
			});
			//开场动画
			openAnimation(me.dom,me._from,200,null,function(){
				//处理是否易于关闭
				easyCloseHandle.call(me,param.easyClose,true);
			});
		});
	}
	//使用close方法
	POP.prototype.close = closeAnimation(500);
	POP.prototype.adapt = function(){
		var fixSize = adaption(outerWidth(this.dom),outerHeight(this.dom));
		animation(this.dom,{
			top : fixSize.top,
			left : fixSize.left
		}, 100);
	};

	/**
	 * CONFIRM 
	 */
	function CONFIRM(param){
		var param = param || {};
		var me = this;
		
		var this_html = utils.render(confirm_tpl,{
			'text' : param.text || 'need text in parameter!'
		});
		this.dom = utils.createDom(this_html)[0];
		this.closeFn = param.closeFn || null;
		this._mask = typeof(param.mask) == 'boolean' ? param.mask : true;
		this._from = param.from || 'top';
		
		add_confirm(this.dom,param,function(){
			me.close();
		});
		//显示蒙层
		showMask(this._mask,function(){
			private_mainDom.appendChild(me.dom);
			
			var newPosition = adaption(300,outerHeight(me.dom));
			setCSS(me.dom,{
				top : newPosition.top,
				left : newPosition.left
			});
			openAnimation(me.dom,me._from,100,null,function(){
				//处理是否易于关闭
				easyCloseHandle.call(me,param.easyClose,true);
			});
		});
	}
	CONFIRM.prototype.close = closeAnimation(200);


	/**
	 * ASK 
	 */
	function ASK(text,callback,param){
		var me = this;
		var param = param || {};
		
		var this_html = utils.render(ask_tpl,{
			'text' : text || 'need text in parameter!'
		});

		this.dom = utils.createDom(this_html)[0];
		this._mask = typeof(param.mask) == 'boolean' ? param.mask : true;
		this._from = param.from || 'top';
		this.inputDom = findByClassName(me.dom,'UI_ask_key')[0];
		this.closeFn =  null;
		
		var confirm_html = utils.render(confirmBar_tpl,{
			'confirm' : '确定',
			'cancel' : '取消'
		});
		
		this.dom.appendChild(utils.createDom(confirm_html)[0]);
		
		//确定
		utils.bind(this.dom,'click','.UI_pop_confirm_ok',function(){
			//根据执行结果判断是否要关闭弹框
			callback ? ((callback(me.inputDom.value) != false) && me.close()) : me.close();
		});
		//取消
		utils.bind(this.dom,'click','.UI_pop_confirm_cancel',function(){
			me.close();
		});

		//显示蒙层
		showMask(this._mask,function(){
			private_mainDom.appendChild(me.dom);
			var newPosition = adaption(300,outerHeight(me.dom));
			setCSS(me.dom,{
				top : newPosition.top,
				left : newPosition.left
			});
			openAnimation(me.dom,me._from,100,80,function(){
				me.inputDom.focus();
				//处理是否易于关闭
				easyCloseHandle.call(me,param.easyClose,true);
			});
		});
		
	}
	ASK.prototype.close = closeAnimation(200);
	ASK.prototype.setValue = function(text){
		this.inputDom.value = text.toString();
	};


	/**
	 * prompt
	 * 
	 **/
	function PROMPT(text,time,param){
		var param = param || {};
		
		this.dom = utils.createDom(prompt_tpl)[0];
		this._from = param.from || 'bottom';
		this.tips(text,time);
		
		// create pop
		setCSS(this.dom,{
			top : private_winH/3 + private_scrollTop
		});
		private_mainDom.appendChild(this.dom);
		
		openAnimation(this.dom,this._from,100,30);
	}
	PROMPT.prototype.close = closeAnimation(80);
	PROMPT.prototype.tips = function(txt,time){
		var me = this;
		if(txt){
			findByClassName(this.dom,'UI_prompt_cnt')[0].innerHTML = txt;
		}
		if(time != 0){
			setTimeout(function(){
				me.close();
			},(time || 1500));
		}
	};

	/**
	 *	PLANE 
	 */
	function PLANE(param){
		var me = this;
		var param = param || {};
		
		this.closeFn = param.closeFn || null;

		this.dom = utils.createDom(plane_tpl)[0];
		this._from = param.from || null;
		
		//insert html
		this.dom.innerHTML = param.html || '';
		
		setCSS(this.dom,{
			'width' : param.width || 240,
			'height' :param.height || null,
			'top' : isNum(param.top) ? param.top : 300,
			'left' : isNum(param.left) ? param.left : 800
		});
		
		private_mainDom.appendChild(this.dom);
		
		openAnimation(this.dom,this._from,100,null,function(){
			//处理是否易于关闭
			easyCloseHandle.call(me,true);
		});
	}
	PLANE.prototype.close = closeAnimation(200);


	/***
	 * 全屏弹框
	 * COVER 
	 */
	function COVER(param){
		var param = param || {};
		var me = this;
		this.dom = utils.createDom(cover_tpl)[0];
		this._mask = typeof(param.mask) == 'boolean' ? param.mask : false;
		this._from = param.from || 'top';
		
		this.cntDom = findByClassName(this.dom,'UI_cnt')[0];
		this.closeFn = param.closeFn || null;
		
		
		//关闭事件
		utils.bind(this.dom,'click','.UI_close',function(){
			me.close();
		});

		
		//记录body的scrollY设置
		this._bodyOverflowY = getCSS(private_body,'overflowY');
		var cssObj = {
			width : isNum(param.width) ? Math.min(private_docW,param.width) : null,
			height : isNum(param.height) ? Math.min(private_winH,param.height) : private_winH
		};
		//水平定位
		if(isNum(param.right)){
			cssObj.right = param.right;
		}else if(isNum(param.left)){
			cssObj.left = param.left;
		}else{
			cssObj.position = 'relative';
			cssObj.margin = 'auto';
		}
		//垂直定位
		if(isNum(param.bottom)){
			cssObj.top = private_winH - cssObj.height - param.bottom + private_scrollTop;
		}else if(isNum(param.top)){
			cssObj.top = private_scrollTop + param.top;
		}else{
			cssObj.top = private_scrollTop + (private_winH - cssObj.height)/2
		}
		//打开蒙层
		showMask(this._mask,function(){
			setCSS(me.dom,cssObj);
			private_mainDom.appendChild(me.dom);
			
			openAnimation(me.dom,me._from,200,400,function(){
				setCSS(private_body,{
					'overflowY' : 'hidden'
				});
				//处理是否易于关闭
				easyCloseHandle.call(me,true);
			});
		});
		//insert html
		this.cntDom.innerHTML = param.html || '';
	}
	//使用close方法
	COVER.prototype.close = closeAnimation(400,500,function(){
		setCSS(this.cntDom,{
			overflowY : 'hidden'
		});
		setCSS(private_body,{
			overflowY : this._bodyOverflowY
		});
	});

	/**
	 * 选择功能
	 */
	function SELECT(list,param){
		var me = this,
			param = param || {},
			list = list || [],
			fns = [],
			nameList = [];
		
		utils.each(list,function(i,item){
			nameList.push(item[0]);
			fns.push(item[1]);
		});
		var this_html = utils.render(select_tpl,{
			'list' : nameList,
			'title' : param.title || null,
			'intro' : param.intro || null
		});
		
		this.dom = utils.createDom(this_html)[0];
		this.closeFn = param.closeFn || null;
		this._from = param.from || 'bottom';
		this._mask = private_docW > 640 ? param.mask : true;
		
		//绑定事件
		var btns = findByClassName(this.dom,'UI_select_btn');
		utils.each(btns,function(index,btn){
			utils.bind(btn,'click',function(){
				fns[index] && fns[index]();
				me.close();
			});
		});
		
		//显示蒙层
		showMask(this._mask,function(){
			if(private_docW > 640){
				var cssObj = {
					top : param.top || 100,
					left : param.left || 100,
					width : param.width || 200
				};
				private_mainDom.appendChild(me.dom);
				
				setCSS(me.dom,cssObj);
				var newSize = fix_position(cssObj.top,cssObj.left,cssObj.width,outerHeight(me.dom));
				setCSS(me.dom,{
					left : newSize.left,
					top : newSize.top
				});
				
				
			} else {
				me._from = 'bottom';
				private_fixedScreenBottomDom.appendChild(me.dom);
				setCSS(me.dom,{
					bottom : 0
				});
			}
			openAnimation(me.dom,me._from,200,400,function(){
				easyCloseHandle.call(me,param.easyClose,true);
			});
		});
		
	}
	SELECT.prototype.close = closeAnimation(200);
	/**
	 *  抛出对外接口
	 */
	return {
		pop : function(){
			return new POP(arguments[0]);
		},
		config : {
			gap : function(name,value){
				//name符合top/right/bottom/left,且value值为数字类型（兼容字符类型）
				if(name && typeof(private_CONFIG.gap[name]) == 'number' && isNum(value)){
					private_CONFIG.gap[name] = parseInt(value);
				}
			},
			zIndex : function(num){
				var num = parseInt(num);
				if(num > 0){
					private_CONFIG.zIndex = num;
					setCSS([private_allCnt,private_fixedScreenBottomDom],{
						zIndex : num
					});
				}
			}
		},
		confirm : function(){
			return new CONFIRM(arguments[0]);
		},
		ask : function(text,callback,param){
			return new ASK(text,callback,param);
		},
		prompt : function(txt,time,param){
			return new PROMPT(txt,time,param);
		},
		plane : function(){
			return new PLANE(arguments[0]);
		},
		cover : function(){
			return new COVER(arguments[0]);
		},
		select : function(){
			return new SELECT(arguments[0],arguments[1]);
		}
	};
},requires('utils.js'));