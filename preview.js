var preview = function(config){
	
	if(typeof config != "object"){

		throw "need param [config]";

		return ;
	}

	this.dragBox = config.dragBox ; //拖动响应的区域 响应之后会在这个区域生成预览和裁剪的canvas
	this.fileInput = config.fileInput; //上传的按钮
	this.width = 200; //
	this.height = 200; //
	this.uploadImg = new Image();
	this.canvasBg = document.createElement("canvas"); //背景canvas
	this.canvasFilter = document.createElement("canvas"); //选择框canvas
	this.canvasShow = document.createElement("canvas");
	this.clipInfo = {
		x : 0,
		y : 0 ,
		width : 100 ,
		height : 100
	}

	actioncb = config.actioncb;

	var self = this;

	var filterCtx = this.canvasFilter.getContext("2d");

	var bgCtx = this.canvasBg.getContext("2d");

	var clipInfo = this.clipInfo;

	var dragBox = this.dragBox;

	var uploadImg = this.uploadImg;

	var canvasBg = this.canvasBg;

	var canvasFilter = this.canvasFilter;

	var filterMinSize = 40;

	bindDragEvent();

	function getPostion(elm){

		var temp = {
			x : 0,
			y : 0
		}
		while(elm != document.body){
			temp.x = temp.x + elm.offsetLeft;
			temp.y = temp.y + elm.offsetTop;
			elm = elm.offsetParent;
		}
		return temp;
	}

	function bindDragEvent(){

		dragBox.addEventListener("dragover",function(e){

			e.preventDefault();

			dragBox.classList.add("hover");

		});

		dragBox.addEventListener("dragleave",function(e){

			e.preventDefault();

			dragBox.classList.remove("hover");

		})

		/* 添加文件事件 */

		dragBox.addEventListener("drop",function(e){

			e.preventDefault();

			dragBox.classList.remove("hover");

			// 获取文件列表对象
			var files = e.target.files || e.dataTransfer.files;

			var count = 0; 

			var file = files[0];

			var reader = new FileReader();

			reader.onload = function(e) {
				
				var uploadImg = self.uploadImg;

				uploadImg.src = e.target.result;

				viewUploadImage();

			}
			reader.readAsDataURL(file);

		});
	}

	function viewUploadImage(){

		dragBox.innerHTML = ""; //清空dragBox

		var scale = uploadImg.width / uploadImg.height;

		var newWidth , newHeight;

		if(scale > 1){ //则以宽为标准 

			newWidth = self.width;

			newHeight = Math.floor(newWidth/scale);

			filterMaxSize = newHeight; //能裁剪的最大长度

		}else{

			newHeight = self.height;

			newWidth = Math.floor(newHeight * scale);

			filterMaxSize = newWidth; //能裁剪的最大长度

		}

		uploadImg.width = newWidth;

		uploadImg.height = newHeight;

		canvasBg.width = newWidth;

		canvasBg.height = newHeight;

		canvasFilter.width = newWidth;

		canvasFilter.height = newHeight;

		dragBox.appendChild(self.canvasBg);

		dragBox.appendChild(self.canvasFilter);

		bgCtx.drawImage(uploadImg,0,0,newWidth,newHeight);

		uploadImg.src = self.canvasBg.toDataURL(); // important 设置width和height和，页面上显示会缩小，但是图片的原始数据没变，如果裁剪时，依旧使用这个uploadImg，他计算裁剪数据时是以未缩放的数据进行计算就会有问题。

		drawFilter(clipInfo.x, clipInfo.y, clipInfo.width ,clipInfo.height);

		addMoveLisenter();

		if(actioncb){
			actioncb();
		}
	}

	function addMoveLisenter(){

		var startX,startY,clickX,clickY,scaling,moving,selectCorner;

		var filterPostion = getPostion(self.canvasBg);

		self.canvasFilter.addEventListener("mousedown",function(e){

			startX = e.pageX,

			startY = e.pageY;

			clickX = startX - filterPostion.x;

			clickY = startY - filterPostion.y;

			scaling = false;

			moving = false;

			/* 检查是否点击了缩放按钮 */
			corners.forEach(function(corner,i){

				filterCtx.beginPath();

				filterCtx.arc(corner.x,corner.y,5,0,Math.PI*2);

				if(filterCtx.isPointInPath(clickX,clickY)){

					scaling = true ;

					selectCorner =  i;

					return false;
				}

				filterCtx.closePath();

			});

			if(!scaling){

				/* 检查是否在裁剪区域内 */
				filterCtx.beginPath();

				filterCtx.rect(clipInfo.x,clipInfo.y,clipInfo.width,clipInfo.height);

				if(filterCtx.isPointInPath(clickX,clickY)){

					moving = true;

				}

				filterCtx.closePath();
				
			}
			
		});

		self.canvasFilter.addEventListener("mousemove",function(e){

			if(scaling){
				scaleFilter(e);
			}

			if(moving){
				moveFilter(e);
			}

			if(actioncb){
				actioncb();
			}

		});
		document.body.addEventListener("mouseup",function(e){

			moving = false;
			scaling = false;

		});

		function scaleFilter(e){

				var nowX = e.pageX, 

					nowY = e.pageY,

					moveX = nowX - startX, //横向移动的距离

					moveY = nowY - startY; //纵向移动的距离

				startX = nowX;

				startY = nowY;

				var len = Math.floor(Math.sqrt(Math.pow(moveX,2) + Math.pow(moveY,2)));	// 增加或减少的长度

				var direct;
				//四个角的顺序是 从左上开始，顺时针 分别对应 0,1,2,3。方向亦如此。
				//根据移动的方向，和选中的角判断出是缩放还是扩大
				if(moveX <= 0 && moveY <= 0){

					direct = 0; 

				}else if(moveX >= 0 && moveY <= 0){

					direct = 1;

				}else if(moveX >=0 && moveY >=0){

					direct = 2;

				}else if(moveX <= 0 && moveY >= 0){

					direct = 3;

				}

				if(direct == selectCorner){//扩大

					clipInfo.width += len ;

					clipInfo.height += len ;

					// if(clipInfo.width > filterMaxSize){

					// 	clipInfo.width = filterMaxSize;

					// 	clipInfo.height = filterMaxSize;

					// }

				}else if(Math.abs(direct - selectCorner) == 2) { // 缩小

				 	clipInfo.width -= len ;

				 	clipInfo.height -= len ;
				 	// 缩小的情况是不可能超过边界的 所以直接判断长度小于最小长度即可
				 	if(clipInfo.width < filterMinSize){

				 		clipInfo.width = filterMinSize;

				 		clipInfo.height = filterMinSize;

				 	}

				}

				var noMovePoint; //选中角的对角，即坐标不会改变的那个角

				//求得坐标不会变的那个角 那个角即为选中角的对角
				if(selectCorner + 2 > 3){

					noMovePoint = (selectCorner + 2)%4;

				}else{

					noMovePoint = selectCorner + 2;

				}

				if(noMovePoint == 0 ){

					clipInfo.x = corners[noMovePoint].x;

					clipInfo.y = corners[noMovePoint].y; 

				}else if(noMovePoint ==1){

					clipInfo.x = corners[noMovePoint].x - clipInfo.width;

					clipInfo.y = corners[noMovePoint].y; 

				}else if(noMovePoint ==2){

					clipInfo.x = corners[noMovePoint].x - clipInfo.width;

					clipInfo.y = corners[noMovePoint].y - clipInfo.height ;


				}else if(noMovePoint ==3){

					clipInfo.x = corners[noMovePoint].x;

					clipInfo.y = corners[noMovePoint].y - clipInfo.height; 

				}

				drawFilter(clipInfo.x,clipInfo.y,clipInfo.width,clipInfo.height);
				
		}

		function moveFilter(e){

			var nowX = e.pageX, 

				nowY = e.pageY,

				moveX = nowX - startX, //横向移动的距离

				moveY = nowY - startY; //纵向移动的距离

			clipInfo.x = clipInfo.x + moveX;

			clipInfo.y = clipInfo.y + moveY;

			startX = nowX;

			startY = nowY;

			if(clipInfo.x < 0){
				
				clipInfo.x = 0 ;

			}
			if(clipInfo.x + clipInfo.width > self.canvasFilter.width ){

				clipInfo.x = self.canvasFilter.width - clipInfo.width ;	

			}
			if(clipInfo.y < 0){
				
				clipInfo.y = 0 ;

			}
			if(clipInfo.y + clipInfo.height > self.canvasFilter.height ){

				clipInfo.y = self.canvasFilter.height - clipInfo.height;	
				
			}

			drawFilter(clipInfo.x, clipInfo.y, clipInfo.width ,clipInfo.height);

		}

	}

	function drawFilter(x,y,width,height){

		corners = [{
			x : x , 
			y : y
		},{
			x : x + width,
			y : y
		},{
			x : x + width,
			y : y + height			
		},{
			x : x ,
			y : y + height
		}];

		// /* 对参数进行检测 */
		if(corners[0].x < 0){

			clipInfo.x = 0;

			clipInfo.width = corners[2].x - 0;

			clipInfo.height = clipInfo.width;

			drawFilter(clipInfo.x,clipInfo.y,clipInfo.width,clipInfo.height);

			return ;
		}
		if(corners[0].y < 0){

			clipInfo.y = 0 ;

			clipInfo.width = corners[2].y - 0;

			clipInfo.height = clipInfo.width;

			drawFilter(clipInfo.x,clipInfo.y,clipInfo.width,clipInfo.height);

			return;
		}

		if(corners[2].x > self.width){

			clipInfo.width = self.canvasFilter.width- clipInfo.x;

			clipInfo.height = clipInfo.width;

			drawFilter(clipInfo.x,clipInfo.y,clipInfo.width,clipInfo.height);

			return;
		}

		if(corners[2].y > self.height){

			clipInfo.height = self.canvasFilter.height - clipInfo.y;

			clipInfo.width = clipInfo.height;

			drawFilter(clipInfo.x,clipInfo.y,clipInfo.width,clipInfo.height);

			return;
		}

		filterCtx.clearRect(0,0,self.width,self.height);

		filterCtx.beginPath();

		filterCtx.globalAlpha= 0.5;

		filterCtx.rect(0,0,self.width,self.height);

		filterCtx.fillStyle = "#fff";

		filterCtx.fill();

		filterCtx.closePath();

		filterCtx.clearRect(x,y,width,height);


		
		filterCtx.globalAlpha= 1; 

		corners.forEach(function(corner,i){

			filterCtx.beginPath();

			filterCtx.arc(corner.x,corner.y,5,0,Math.PI*2);

			filterCtx.fillStyle = "#fff";

			filterCtx.fill();

			filterCtx.closePath();

		}); //回执裁剪的框

	}
	
}
preview.prototype.getClipBase64 = function () {
	
	var canvasShow = this.canvasShow;

	var clipInfo = this.clipInfo;

	var ctx = canvasShow.getContext("2d");

	canvasShow.width = clipInfo.width;

	canvasShow.height = clipInfo.height;

	ctx.drawImage(this.uploadImg,clipInfo.x,clipInfo.y,clipInfo.width,clipInfo.height,0,0,clipInfo.width,clipInfo.height);

	return canvasShow.toDataURL();

}
