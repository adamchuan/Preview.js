'use strict';

var Preview = (function(){

    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || window.oRequestAnimationFrame || function( callback ) {
        setTimeout( callback, 1000 / 60 );
    };

    var input_dom = document.querySelector( '#input_upload' ),
        canvas = document.querySelector( '#editcanvas' ),
        btn_upload_dom = document.querySelector( '.btn_upload' ),
        btn_group_dom = document.querySelector( '#btn_control' ),
        btn_send_dom = document.querySelector( '#btn_send' ),
        btn_reupload_dom = document.querySelector( '#btn_reupload' ),
        ctx = canvas.getContext( '2d' ),
        canvas_width = canvas.width,
        canvas_height = canvas.height,
        source_img = {},
        dec_img = new Image(),
        start = {},
        pos = getPos( canvas ); //几个辅助计算的值

    var canvas_hammer = new Hammer( canvas );
    canvas_hammer.get( 'pinch' ).set( {
        enable: true
    } );
    canvas_hammer.on( 'pinchstart', pinchHandler );
    canvas_hammer.on( 'pinchend', pinchHandler );
    canvas_hammer.on( 'pinchin', pinchHandler );
    canvas_hammer.on( 'pinchout', pinchHandler );
    canvas_hammer.on( 'pinchcancel', pinchHandler );
    canvas_hammer.on( 'panstart', panHandler );
    canvas_hammer.on( 'panmove', panHandler );
    canvas_hammer.on( 'panend', panHandler );
    canvas_hammer.on( 'pancancel', panHandler );
    
    new Hammer( btn_upload_dom ).on( 'tap', function( e ) {
        input_dom.click();
    } );
    new Hammer( btn_reupload_dom ).on( 'tap', function( e ) {
        input_dom.click();
    } );

    input_dom.addEventListener( 'change', fileupload );
    initDecImg();

    window.onerror = function( e ) {
        console.log( e );
    }

    /*
        文件改变监听
     */
    function fileupload( e ) {
        var files = e.target.files || e.dataTransfer.files;
        var file = files[ 0 ];
        readfile( file, function( data ) {
            btn_upload_dom.classList.add( 'hide' );
            btn_group_dom.classList.remove( 'hide' );

            initImage( data, function( img ) {

                var ratio = img.width / img.height; //宽高比

                if ( ratio > canvas_width / canvas_height ) { //则以宽为标准 
                    source_img.scale = canvas_height / img.height;
                } else {
                    source_img.scale = canvas_width / img.width;
                }

                source_img.img = img;
                // 矩阵变换
                source_img.width = start.width = img.width;
                source_img.height = start.height = img.height;
                source_img.x = start.x = 0; //translate的值
                source_img.y = start.y = 0;
                source_img.origin_x = start.origin_x = 0; //transform-origin的值
                source_img.origin_y = start.origin_y = 0;

                source_img.scale_min = start.scale = source_img.scale; //最小的缩放值
                source_img.scale_max = source_img.scale_min * 2;

                fadeIn(200);
            } );
        } );
    }

    /*
        缩放监听
     */
    function pinchHandler( e ) {

        source_img.scale = start.scale * e.scale;
        console.log( source_img.scale );
        switch ( e.type ) {
            case 'pinchstart':
                console.log( 'pinchstart' );
                source_img.origin_x = e.center.x - pos.left / 2;
                source_img.origin_y = e.center.y - pos.top / 2;
                break;
            case 'pinchcancel':
            case 'pinchend':
                console.log( 'pinchend' );

                start.scale = source_img.scale;
                checkPosition();
                break;
        }
        drawImage();
    }

    /*
        平移监听
     */
    function panHandler( e ) {

        source_img.x = start.x + e.deltaX,
            source_img.y = start.y + e.deltaY;

        switch ( e.type ) {
            case 'panstart':
                canvas_hammer.get( 'pinch' ).set( {
                    enable: false
                } );
                break;
            case 'pancancel':
            case 'panend':

                canvas_hammer.get( 'pinch' ).set( {
                    enable: true
                } );
                start.x = source_img.x;
                start.y = source_img.y;

                var vx = e.velocityX,
                    vy = e.velocityY;

                checkPosition();

                return;
                break;
        }
        drawImage();
    }

    /* 
        对位置进行修正
    */
    function checkPosition() {

        var target = {};
        var scale = source_img.scale;

        if ( source_img.scale < source_img.scale_min ) {
            scale = target.scale = source_img.scale_min;
        } else if ( source_img.scale > source_img.scale_max ) {
            scale = target.scale = source_img.scale_max;
        }

        /*
            这里的view_x 和 view_y特别做个说明：
            原始的image的image的x,y是相对于是没有产生缩放时候的值，
            在进行缩放时，仍然使用的是原始的x,y值带入坐标运算，
            但最终在视觉上看到的x,y是产生变化了的，所以需要单独计算
         */

        var view_x = ( source_img.x - source_img.origin_x ) * scale + source_img.origin_x,
            view_y = ( source_img.y - source_img.origin_y ) * scale + source_img.origin_y;

        /*
            检查 view_x,view_y是否未达到边界，然后对x,y进行修正
         */
        if ( view_x > 0 ) { //图片没有达到左轴
            target.x = 0;
            target.origin_x = 0;
        } else if ( view_x < 0 && view_x + scale * source_img.width < canvas_width ) { //图片没有达到右轴，
            view_x = canvas_width - scale * source_img.width;
            target.x = ( view_x - source_img.origin_x ) / scale + source_img.origin_x; //从view_x 得到 x
        }

        if ( view_y > 0 ) { //图片没有达到上轴
            target.y = 0;
            target.origin_y = 0;
        } else if ( view_y < 0 && view_y + scale * source_img.height < canvas_height ) { //图片没有达到下轴
            view_y = canvas_height - scale * source_img.height;
            target.y = ( view_y - source_img.origin_y ) / scale +
                source_img.origin_y; //从view_y 得到 y
        }

        flexibleTransform( target, 200 )
        return;

    }

    function flexibleTransform( target, time, cb ) {
        var start_time = new Date().getTime(),
            startValue = {},
            flag_changed = false;
        for ( var i in target ) {
            flag_changed = true;
            startValue[ i ] = source_img[ i ];
            start[ i ] = target[ i ];
        }

        if ( flag_changed ) {
            var animation = function() {

                var now_time = new Date().getTime(),
                    cost_time = now_time - start_time,
                    progress = cost_time / time,
                    end = false;
                if ( cost_time >= time ) {
                    end = true;
                    progress = 1;
                }

                for ( var i in target ) {
                    source_img[ i ] = startValue[ i ] - ( startValue[ i ] - target[ i ] ) * progress;
                }
                drawImage();
                if ( !end ) {
                    requestAnimationFrame( animation );
                } else if ( cb ) {
                    cb();
                }
            }

            animation();
        }
    }

    function fadeIn(time,cb){
        var start_time = new Date().getTime();

        var animation = function(){
            var now_time = new Date().getTime(),
                cost_time = now_time - start_time,
                progress = cost_time / time,
                end = false;
            if ( cost_time >= time ) {
                end = true;
                progress = 1;
            }
            ctx.globalAlpha = 1 * progress;

            drawImage();
            if ( !end ) {
                requestAnimationFrame( animation );
            } else if ( cb ) {
                cb();
            }
        }
        animation();
    }

    function drawImage( img ) {
        /* canvas 的 transform 一旦设置，
            之后绘制的图像都会按这个transform进行变化
            tansform 是相对于上一次的 transfrom的值进行变化
            而 setTransfrom 是相对原始的transform的值。

            transfrom会适用与clearRect
            例如:
            ctx.transform(2,0,0,2,0,0);
            ctx.transform(0.5,0,0,0.5,0,0);

            最终ctx上transform的scale为1；
            
            ctx.setTransform(2,0,0,2,0,0);
            ctx.setTransform(0.5,0,0,0.5,0,0);

            最终ctx上transform的scale为0.5；
            
        */


        ctx.setTransform( 1, 0, 0, 1, 0, 0 );
        ctx.clearRect( 0, 0, canvas_width, canvas_height );

        ctx.save();
        ctx.transform( source_img.scale, 0, 0, source_img.scale, source_img.origin_x, source_img.origin_y );
        ctx.translate( -source_img.origin_x, -source_img.origin_y );
        ctx.drawImage( source_img.img, source_img.x, source_img.y );
        ctx.setTransform( 1, 0, 0, 1, 0, 0 );
        ctx.restore();

    }

    function getPos( dom ) {
        var top = 0;
        var left = 0;
        while ( dom ) {
            top += dom.offsetTop;
            left += dom.offsetLeft;
            dom = dom.offsetParent;
        }
        return {
            left: left,
            top: top
        }
    }

    function initImage( src, cb ) {
        var img = new Image();
        img.src = src;
        img.onload = function() {
            cb( img );
        }
    }

    /*
     读取为文件，格式为base64
     */
    function readfile( file, cb ) {
        var reader = new FileReader();
        reader.onload = function( e ) {
            var data = e.target.result
            cb( data )
        }
        reader.readAsDataURL( file );
    }

    return {
        getImage : function(){
            return canvas.toDataURL();
        }
    }
})();
