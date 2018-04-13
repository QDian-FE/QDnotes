## 小程序模块化解决方案
* [Labrador](https://github.com/maichong/labrador)
> 大概是这样的, 本来想讲讲Labrador, 后来发现了wepy, 现在看到了mpvue. 关于小程序, 都是在搬砖..  
> 突然看到了一个篇文章, 关于区块链撸猫, 蛮有意思..


## 起因与基本名词介绍
* 一篇技术文章: [区块链撸猫](https://mp.weixin.qq.com/s/hqb2qB-xwcF8W5-QxnO46A)
* 从未接触第一次接触, 有点兴趣

### 网站介绍
* [CryptoKitties](https://www.cryptokitties.co/)
* 以太坊平台运行. 使用以太币进行交易
* 收养, 繁殖, 变异
* 每十五分钟释放一款新品
* 256个基因随意组合
* 一次繁殖一次降级, 但可以通过其他东西涨回来

### 以太坊
> 参考 (以太坊开发入门)(https://www.cnblogs.com/tinyxiong/p/7878468.html)
* 一个公共区块链平台.
* 我们可以在这个平台中使用区块链技术写应用.
* 已经封装完成, 有一个完整的开发生态圈. 
* 就像一个安卓开发平台, 我们可以基于这个平台, 写自己的应用.

### 智能合约
* 以太坊中的程序就是智能合约, 使用代码和数据的集合
* 其实就是自动执行, 代码形式编写的合同.
* 突破了比特币能够编写程序的很多限制.
* 语言为Solidity, .sol文件.需要有一个EVM的运行环境

### MetaMask
* 以太坊的一个轻钱包
* 以Chrome插件的形式存在

### Truffle
* [官网](http://truffleframework.com/docs/)
* [truffle中文](http://truffle.tryblockchain.org/)
* 生成以太坊的开放环境, 测试框架和资产通道.
* 可以开发, 测试和发布只能合约的前端框架

### Ganache
* 创建一个虚拟的以太坊区块链
* 生成一些我们再开发过程中用到的虚拟账号

### Solidity(接下来会好好看看)
* [中文简介](http://wiki.jikexueyuan.com/project/solidity-zh/introduction.html)
* [官网](https://solidity.readthedocs.io/en/v0.4.21/)
* 类似与JS的语言
* 编写智能合约

### Geth (`没有理解的特别好`)
* Go语言
* 可以帮助我们链接到区块链的核心应用程序.
* 也可以启动一个新的区块链, 创建合约, 挖矿.


## 搭建一个宠物店的流程
> 在以太坊平台上构建一个DApp

### 大概步骤
* 部署开发环境
* 编写并部署智能合约
* 测试合约并创建交互

### 开发环境准备
* 基本开发环境: node, npm
* 以太坊开发前端框架: [truffle](https://github.com/trufflesuite/truffle)
  1. `npm install -g truffle`
* 以太坊虚拟私链: [ganache](http://truffleframework.com/ganache/)
  1. 在官网下载安装即可

### 项目搭建
1. `truffle unbox metacoin`
2. 目录分析: 
```
* src: 给用户用的
* contracts: 存放智能合约
* Migrations: 存放智能合约的配置
* test: 存放测试文件
* truffle.js: 配置文件
```
3. 编写智能合约
> 在contracts中创建` Adoption.sol`文件
```sol
pragma solidity ^0.4.17;

contract Adoption {
   address[16] public adopters;

   //adopting a pet
   function adopt(uint petId) public returns (uint) {
     require(petId >= 0 && petId <= 15);
     adopters[petId] = msg.sender;
     return petId;
   }

   //retrieve the adopters
   function getAdopters() public view returns (address[16]) {
     return adopters;
   }
}
```
4. 编译合约 `truffle compile`
5. 部署合约
> 在 migratios/ 目录内创建新文件 2_deploy_contracts.js
```sol
var Adoption = artifacts.require("Adoption");

module.exports = function(deployer) {
   deployer.deploy(Adoption);
};
```
6. 确保安装了`ganache`
7. 将合约部署到以太坊(私链上面) `truffle migrate`
8. 编写测试文件TestAdoption.sol
```
pragma solidity ^0.4.17;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Adoption.sol";

contract TestAdoption {
   Adoption adoption = Adoption(DeployedAddresses.Adoption());

   //test adopt() function
   function testUserCanAdoptPet() public {
     uint returnedId = adoption.adopt(8);

     uint expected = 8;

     Assert.equal(returnedId, expected, "Adoption of Pet ID 8 should be recorded.");
   }

   //test retrieve of a single pet owner
   function testGetAdopterAddressByPetId() public {
     //expected owner is this contract
     address expected = this;
     address adopter = adoption.adopters(8);
     Assert.equal(adopter, expected, "owner of pet id 8 should be recorded.");
   }

   //test retrive of all pet owners
   function testGetAdopterAddressByPetIdInArray() public {
     //expected owner is this contract
     address expected = this;
     address[16] memory adopters = adoption.getAdopters();

     Assert.equal(adopters[8], expected, "owner of pet id 8 should be recorded.");
   }
}
```
9. 执行测试`truffle test`
10. 编写用户界面 src/js/app.js
```js
App = {
 web3Provider: null,
 contracts: {},

 init: function() {
   // Load pets.
   $.getJSON('../pets.json', function(data) {
     var petsRow = $('#petsRow');
     var petTemplate = $('#petTemplate');

     for (i = 0; i < data.length; i ++) {
       petTemplate.find('.panel-title').text(data[i].name);
       petTemplate.find('img').attr('src', data[i].picture);
       petTemplate.find('.pet-breed').text(data[i].breed);
       petTemplate.find('.pet-age').text(data[i].age);
       petTemplate.find('.pet-location').text(data[i].location);
       petTemplate.find('.btn-adopt').attr('data-id', data[i].id);

       petsRow.append(petTemplate.html());
     }
   });

   return App.initWeb3();
 },

 initWeb3: function() {
   // Is there an injected web3 instance?
if (typeof web3 !== 'undefined') {
 App.web3Provider = web3.currentProvider;
} else {
 // If no injected web3 instance is detected, fall back to Ganache
 App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
}
web3 = new Web3(App.web3Provider);

   return App.initContract();
 },

 initContract: function() {
   $.getJSON('Adoption.json', function(data) {
 // Get the necessary contract artifact file and instantiate it with truffle-contract
 var AdoptionArtifact = data;
 App.contracts.Adoption = TruffleContract(AdoptionArtifact);

 // Set the provider for our contract
 App.contracts.Adoption.setProvider(App.web3Provider);

 // Use our contract to retrieve and mark the adopted pets
 return App.markAdopted();
});

   return App.bindEvents();
 },

 bindEvents: function() {
   $(document).on('click', '.btn-adopt', App.handleAdopt);
 },

 markAdopted: function(adopters, account) {
   var adoptionInstance;

App.contracts.Adoption.deployed().then(function(instance) {
 adoptionInstance = instance;

 return adoptionInstance.getAdopters.call();
}).then(function(adopters) {
 for (i = 0; i < adopters.length; i++) {
   if (adopters[i] !== '0x0000000000000000000000000000000000000000') {
     $('.panel-pet').eq(i).find('button').text('Success').attr('disabled', true);
   }
 }
}).catch(function(err) {
 console.log(err.message);
});
 },

 handleAdopt: function(event) {
   event.preventDefault();

   var petId = parseInt($(event.target).data('id'));

   var adoptionInstance;

web3.eth.getAccounts(function(error, accounts) {
 if (error) {
   console.log(error);
 }

 var account = accounts[0];

 App.contracts.Adoption.deployed().then(function(instance) {
   adoptionInstance = instance;

   // Execute adopt as a transaction by sending account
   return adoptionInstance.adopt(petId, {from: account});
 }).then(function(result) {
   return App.markAdopted();
 }).catch(function(err) {
   console.log(err.message);
 });
});
 }

};

$(function() {
 $(window).load(function() {
   App.init();
 });
});
```
11. 安装MetaMsk
> * 点击`Import Existing DEN`
> * 输入ganache中 12个单词的
> * 粘贴到 Wallet Seed 中
> * Main Network -> Custom RPC
> * 输入在`http://127.0.0.1:7545` : 这是我们在配置文件中写的
12. 剩下的就是前端的活了, `npm install` and `npm run dev`
13. 开启 `http://localhost:3000`
