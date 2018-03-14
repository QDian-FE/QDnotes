var c = document.getElementById("myCanvas")
var ctx = c.getContext("2d")
ctx.font = '40px Tahoma'

// 各种状态, 表示进行到哪一步了.
const state_left = -1 // 状态_左_
const state_up = -2 // 状态_上_
const state_right = -3 // 状态_右_

const state_begin = 1 // 状态_开始_
const state_normal = 2 // 状态_正常_

const state_beginDown = 3 // 状态_开始下落_
const state_downning = 4 // 状态_下落中_

const state_endDown = 14 //--> top 爆炸 end // 状态_结束下落_

const state_boom = 15 // 状态_爆炸_
const state_bomming = 16 // 状态_爆炸中_

const state_endBomm = 26 //--> 开始下落 // 状态_爆炸结束_
const state_gameOver = 27 // 状态_游戏结束_



// 在控制游戏的标志位
var downEndFlag = 0 // 结束下落标记
var nowTime = 0 // 现在时间  时间是累加的, 也就是没渲染一次, 时间就会+1
var showBloxLocationX = 1 // 出现X方块位置
var state = 1 // 状态

var map = new Array(54 + 1).fill(0) // 一个长度为55的数组, 全部元素为0 , 具体不理解这个地图作用

// 动画
var toAnimaition = function (item, x, y) { // 保存整个动画执行信息
  item.positionStart = {
    x: item.x,
    y: item.y
  }
  item.positionEnd = {
    x: x,
    y: y
  }
  item.startAnimationTime = nowTime
}

// 结束
var end = function (item, index) {
  if (!item.isEnd) {
    item.isEnd = true
    item.toxy = {
      x: index % 6,
      y: ~~(index / 6) // 进行类型转换, 其他类型按按照布尔型, 转成对应的0和1
    }
  }
}

// 监听键盘按下
onkeydown = function (event) {
  var keyCode = event.keyCode
  if (state == state_normal) { // 只有在正常情况下, 按下了才能管用
    // 根据按下的按键, 给出当前状态
    state =
      keyCode == 65 && showBloxLocationX != 0 ? state_left :
      keyCode == 87 ? state_up :
      keyCode == 68 && showBloxLocationX != 3 ? state_right :
      keyCode == 83 ? state_beginDown : state_normal
  }
}

// 填充颜色
var setColor = function (num, flag) {
  ctx.fillStyle = 'hsl(' + num * 35 + ',40%,' + flag + '%)'
}


var render = function () { // 渲染函数
  
  ctx.fillStyle = 'rgba(0,0,0,0.2)' // 绘制底色
  ctx.fillRect(0, 0, 300, 500) // 绘制大小

  nowTime++ // 当前时间前进一步

  // 定义数组, 应该是我们的那三个小方块
  var myArr = new Array(6).fill(0)

  downEndFlag = state_begin // 下落结束标记

  var flag = 1 // 标记 这个标记的具体含义还没有理解

  map.forEach((item, index, arr) => { // 55元素, 循环处理
    // 其实每一个元素, 代表了一个格子

    x = index % 6 // 每六个为一个模块组 0~5 在每一行中的位置

    if (index > 47 && state < 0) { // 我猜是第一行,  状态是左右上的时候, 也就是向左右上移动的时候

      myArr[x] = map[index]
      myArr[x + 1] = map[index + 1]

      // 左右 左:1 右:-1 
      var directionFlag = state == state_left ? 1 : state == state_right ? -1 : 0

      // 上 // 更改三个方块的位置
      if (state == state_up) {
        if (flag && item) {
          flag = 0
          map[index + 3] = map[index]
        }
        if (item) {
          myArr[x] = myArr[x + 1]
        }
      }

      map[index] = item = myArr[x + directionFlag]

      if (flag && item) {
        flag = 0
        showBloxLocationX = x
      }

      item && toAnimaition(item, x, 8)
    }

    // 开始状态, 48 49 50 三个位置就是 我们方块初始所在的位置, 渲染输出三个方块的位置
    if (state == state_begin && index > 48 && index < 52) {
      map[index] = { // 三个初始随机出现方块的信息
        x: x,
        y: 10,
        num: Math.random() > 0.5 ? 1 : 2,
        idEnd: false,
        toxy: 0
      }
      toAnimaition(map[index], x, 8) // 起初三块动画出现的动画??
    }

    if (item) { // 如果item是0的话, 就证明这个方格没有东西, 就不会填上

      if (state == state_beginDown) { // 开始下落
        map[index] = 0 // 开始下落的时候, 当前这三块就是0
        if (!item.isEnd) { // 如果还没有结束的话, 
          map[myArr[x] * 6 + x] = item // 找到当前元素应该下落的位置
          toAnimaition(item, x, myArr[x]++)
        }
      }

      if (state == state_boom && item.isEnd && item.toxy) { // 爆炸的同时, 这个模块不再移动, 到达一个XY位置
        toAnimaition(item, item.toxy.x, item.toxy.y)
      }

      if (state == state_endBomm && item.isEnd && !item.toxy) { // 爆炸结束
        item.isEnd = 0
        item.num++ // 当前这个i加一
      }

      if (state == state_endDown) { // 下落结束后, 开始计算是否爆炸
        // 循环这个方块的周围
        for (var i = 0; i < (x == 0 || x == 5 ? 1 : 4); i++) { // 如果是第一个, 或者最后一个, 就判断一次就好了

          // 这两步操作, 应该是匹配出在这个方块周围四条线上的方块, 看看是不是一样的
          var tempArr = [6, 1, 7, -5]
          var a = map[index + tempArr[i]]
          var b = map[index - tempArr[i]]

          //找到相同的, 并进行爆照处理
          if (a && b && a.num == item.num && b.num == item.num) {
            item.isEnd = 1
            item.toxy = 0
            end(a, index)
            end(b, index)
            downEndFlag = state_boom
          }
        }

        if (index > 47 && downEndFlag != state_boom) { // 走到最上面后, 发现当前并没有发生爆炸
          downEndFlag = state_gameOver // 游戏结束
        }
      }
      // 如果不是最上面一行  或者 游戏没有结束, 通过时间控制的闪烁
      if (index < 47 || state != state_gameOver || nowTime % 40 > 20) {
        // 不清楚具体绘制规则
        // 动画
        var per = (nowTime - item.startAnimationTime) / 10
        if (per > 1) {
          per = 1
        }

        item.x = item.positionStart.x + (item.positionEnd.x - item.positionStart.x) * per
        item.y = item.positionStart.y + (item.positionEnd.y - item.positionStart.y) * per

        // 无动画
        // item.x = item.positionEnd.x
        // item.y = item.positionEnd.y

        // 绘制
        x = 50 * item.x
        y = 450 - 50 * item.y
        var num = item.num

        // 画笔颜色
        setColor(num, 65)
        // 画个边框
        ctx.fillRect(x, y, 50, 50)

        // 画笔颜色
        setColor(num, 20)
        // 画个文字
        ctx.fillText(item.num, x + 12, y + 40)
      }
    }
  })

  state = state < 0 ? state_normal : // 动画结束, 在左右上, 那么就是正常状态
    state == state_normal || state == state_gameOver ? state : // 如果状态就是正常, 或者已经游戏结束了, 那就维持现状
    state == state_endDown ? downEndFlag : // 如果状态为下落结束, 那么此刻的状态应为下落结束标记
    state == state_endBomm ? state_beginDown : state + 1 // 如果是爆炸结束状态,  那么此刻的状态为开始下落,,  爆炸结束, 必然开始下落
  // 如果既不是左右上, 又不是正常, 游戏结束, 下落结束, 爆炸结束的话, 就让状态+1 // 这个就是动画还在进行中, 所以继续+1进行动画
  requestAnimationFrame(render)
}
render()