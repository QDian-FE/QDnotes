var vm = {
  data: {
    text: ''
  }
}

Object.defineProperty(data, 'text', {
  set: function (newVal) {
    document.getElementById('model').innerText = newVal
    console.log(newVal)
  },
  get: function() {
  }
})

vm.data.text = "HJlkjlkjlakjsdfasdf"