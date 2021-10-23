const { ApiPromise, WsProvider, Keyring} = require('@polkadot/api');
const { cryptoWaitReady, mnemonicGenerate } = require('@polkadot/util-crypto');

import {
	isWeb3Injected,
	web3Accounts,
	web3Enable,
	web3FromAddress
} from "@polkadot/extension-dapp";
web3Enable('polkadot-js/apps');

// Samples
class PolkadotWeb3JSSample {



	/***
	 * login
	 * @return accounts [{"address":"5D2JMakX2CgtPPkiqUzdsK3Y41vD6HyNy8ZETUjhjRrZFTfG","meta":{"name":"cc1","source":"polkadot-js"}}]

	 */
	async login() {
		if (!isWeb3Injected) {
			throw new Error("Please install/unlock the MathWallet first");
		}
		// meta.source contains the name of the extension that provides this account
		const allAccounts = await web3Accounts();
		return allAccounts;
	}

	async getApi() {
		if(!window.api){
			const provider = new WsProvider(window.PolkadotWeb3Url);
			//window.api = await ApiPromise.create({ provider });
			window.api = await ApiPromise.create({
			    provider: provider,
			    types: {
					VpnId: "u32",
					AreaId: "u16"
				
			    },
			  });

		}
		return window.api;

	}

	async generateUser() {
		await cryptoWaitReady();
		const mnemonic = mnemonicGenerate();

		const keyring = new Keyring({ type: 'sr25519' });
		const user = keyring.addFromUri(mnemonic);
		const userJson = {mnemonic:mnemonic, address:user.address, publicKey:user.publicKey  };

		return userJson;
	}

	async getUser(mnemonic) {
		await cryptoWaitReady();

		const keyring = new Keyring({ type: 'sr25519' });
		const user = keyring.addFromUri(mnemonic);
		const userJson = {mnemonic:mnemonic, address:user.address, publicKey:user.publicKey  };

		return userJson;
	}



	async spreadinfo(addr,  callback ) {
		const api = await this.getApi();

		api.query.web3Spread.spreads(addr, (spreadinfo) => {
		  // Calculate the delta
		  console.log('ALICE have .balances.spreads of  ' + spreadinfo);
		  callback(spreadinfo);
		});

	}

	

	async ownerVpns(addr,  callback ) {
		const api = await this.getApi();

		api.query.web3VpnNft.ownerVpns.keys(addr, (vpnIds) => {
 			Promise.all(
				vpnIds.map(({ args: [key1, key2] }) =>
					api.query.web3VpnNft.vpns(key2)
				)
				
			).then((vpnValues) => {		
				callback(vpnValues);

			}).catch((error) => {
				console.log(error)
				callback("");
			})
		});
	}



	async followers(addr,  callback ) {
		const api = await this.getApi();

		api.query.web3Spread.spreadsReturneds.keys(addr, (followerIds) => {
			console.log("index.js followerIds:" + followerIds);
 			Promise.all(
				followerIds.map(({ args: [key1, key2] }) =>
					api.query.web3Spread.spreadsReturneds(key1,key2)
				)
			).then((followerValues) => {
				var arr = new Array();
				followerIds.forEach(({ args: [era, SpreadReturned] }, key, map) =>{
	 				console.log("user:" + SpreadReturned+  ", score:" + followerValues[key]);
					arr.push({user:SpreadReturned, score: followerValues[key]});
	         
				} );
		
				callback(arr);

			}).catch((error) => {
				console.log(error)
				callback("");
			})
			

//			const followerValues = await Promise.all(
//	 			followerIds.map(({ args: [era, SpreadReturned] }) =>
//	 				api.query.balances.spreadsReturneds(era,SpreadReturned)
//				)
//			 );
//	
//			var arr = new Array();
//			validators.forEach(({ args: [era, SpreadReturned] }, key, map) =>{
//				//console.log('user  ' + SpreadReturned);
//	 			console.log("user:" + SpreadReturned+  ", score:" + followerValues[key]);
//				arr.push({user:SpreadReturned, score: followerValues[key]});
//	         
//			} );
//	
//			callback(arr);

		});

	}


	async getAccountinfo( addr ) {
		const DOT_DECIMAL_PLACES = 1000000000000;
		//const provider = new WsProvider('ws://210.14.145.201:9944');
		//const api = await ApiPromise.create({ provider });
		const api = await this.getApi();
		//const ADDR = '5DUdLn7gNPoSVYbUxpGBKcAiSithE7HrCKkZCFk2cAnLR7rc';
		const balance = await api.query.system.account(addr);
		console.log(`${addr} has ${balance} DEV `);

		//return balance.data.free / DOT_DECIMAL_PLACES ;
		return balance;

	}


	async accountinfo(addr,  callback ) {
		const api = await this.getApi();

		api.query.system.account(addr, (account) => {
		  // Calculate the delta
		  console.log('ALICE has change balance of ' + account);
		  callback(account);
		  //const change = free.sub(previous);
		  // Only display positive value changes (Since we are pulling 'previous' above already,
		  // the initial balance change will also be zero)
		  /*
		  if (!change.isZero()) {
		    previous = free;
		    console.log('New transaction of: '+ change);
		  }*/
		});

	}


	async info( callback ) {
		const api = await this.getApi();
		const chain = await api.rpc.system.chain();
		    //
		let lastHeader = await api.rpc.chain.getHeader();
		
		// Subscribe to the new headers
		const unsubHeads = await api.rpc.chain.subscribeNewHeads((lastHeader) => {
		    console.log(`${chain}: block #${lastHeader.number} =  hash ${lastHeader.hash}`);
		    callback(lastHeader);
		
		});

	}

	async eventInfo( callback ) {
		// Subscribe to system events via storage
		api.query.system.events((events) => {
			// console.log('----- Received ' + events.length + ' event(s): -----');
  			// loop through the Vec<EventRecord>
  			events.forEach((record) => {
  				// extract the phase, event and the event types
   			 	const { event, phase } = record;
    			const types = event.typeDef;
    			// show what we are busy with
    			//console.log("1:"+event.section + ':' + event.method + '::' + 'phase=' + phase.toString());
    			//console.log("2:"+event.meta.documentation.toString());
				console.log("eventInfo:"+event.section + ':' + event.method + '::' + 'data=' + JSON.stringify(event.data));

				/*  
				if(event.section == "web3VpnOcw"  && event.method == "VpnCreated"){
					//在这里转，有些问题，主要是 data[3] 是个字符串，但不是个 json编码的字符串。会有意外的错误
					console.log("eventInfo01:.." +event.data[2]);
					console.log("eventInfo02:.." +event.data[3]);
					var d1 = Buffer.from(event.data[2].buffer).toString();
					var d2 = Buffer.from(event.data[3].buffer).toString();
					console.log("eventInfo11:.." +d1);
					console.log("eventInfo22:.." +d2);

					//event.data[2] = d1;
					//event.data[3] = d2;
				} */
   				console.log("eventInfo:.." + JSON.stringify(event.data));
				callback(event);
    
			});
		});


	}



	async appInfo(callback ) {
		const api = await this.getApi();

		api.query.web3Spread.appCid((app_cid_) => {
			// Calculate the delta
			var app_cid = (Buffer.from(app_cid_.buffer)).toString()
			console.log('app_cid has change  of ' + app_cid);
			callback(app_cid);
		});

	}



	async transfer2(PHRASE, to, amount) {
		const api = await this.getApi();

		const keyring = new Keyring({ type: 'sr25519' });
		const user = keyring.addFromUri(PHRASE);
		console.log(`Sending from address ${user.address} with publicKey [${user.publicKey}]`);

		const txHash = await api.tx.balances
          	.transfer(to, amount)
          	.signAndSend(user);

		    // Show the hash
    		console.log(`Submitted with hash ${txHash}`);


		return txHash;
	}

	async spreadTransfer(PHRASE, to, spread, amount) {
		const api = await this.getApi();

		const keyring = new Keyring({ type: 'sr25519' });
		const user = keyring.addFromUri(PHRASE);
		console.log(`Sending from address ${user.address} with publicKey [${user.publicKey}]`);

		const txHash = await api.tx.web3Spread
          	.spreadTransfer(to, spread,  amount)
          	.signAndSend(user);

		    // Show the hash
    		console.log(`Submitted with hash ${txHash}`);


		return txHash;
	}


	async spreadTransfer2(PHRASE, to, spread, amount) {
		const api = await this.getApi();
		
		const DOT_DECIMAL_PLACES = 1000000000000;
		const x= new BigNumber(amount);
		const y = x.multipliedBy(DOT_DECIMAL_PLACES)

		const keyring = new Keyring({ type: 'sr25519' });
		const user = keyring.addFromUri(PHRASE);
		console.log(`Sending from address ${user.address} with publicKey [${user.publicKey}]`);

		const txHash = await api.tx.web3Spread
          	.spreadTransfer(to, spread,  y)
          	.signAndSend(user);

		    // Show the hash
    		console.log(`Submitted with hash ${txHash}`);


		return txHash;
	}


	async spreadReturn(PHRASE) {
		const api = await this.getApi();

		const keyring = new Keyring({ type: 'sr25519' });
		const user = keyring.addFromUri(PHRASE);
		console.log(`Sending from address ${user.address} with publicKey [${user.publicKey}]`);

		const txHash = await api.tx.web3Spread
          	.spreadReturn()
          	.signAndSend(user);

		    // Show the hash
    		console.log(`Submitted with hash ${txHash}`);


		return txHash;
	}




	async ownerVpns(addr,  callback ) {
		const api = await this.getApi();

		api.query.web3VpnNft.ownerVpns.keys(addr, (vpnIds) => {
 			Promise.all(
				vpnIds.map(({ args: [key1, key2] }) =>
					api.query.web3VpnNft.vpns(key2)
				)
				
			).then((vpnValues_) => {	
				var vpnValues = vpnValues_.map(( [exId, title, count, pledge])=> [(Buffer.from(exId.buffer)).toString(), (Buffer.from(title.buffer)).toString(), count, pledge]	);
				
				callback(vpnValues);

			}).catch((error) => {
				console.log(error)
				callback("");
			})
		});
	}

	async advertiseVpns(areaId,  callback ) {
		const api = await this.getApi();

		api.query.web3VpnNft.advertiseVpns.keys(areaId, (doubleIds) => {
 			Promise.all(
				doubleIds.map(({ args: [key1, key2] }) =>
					api.query.web3VpnNft.advertiseVpns(key1, key2)
				)
				
			).then((advertiseVpns_) => {	

				var advertiseVpns = advertiseVpns_.map(( [title, slogan, ids])=> [(Buffer.from(title.buffer)).toString(), (Buffer.from(slogan.buffer)).toString(),  ids]	);

				var arr = new Array();
				doubleIds.forEach(({ args: [key1, key2] }, index, map) =>{
	 				console.log("user:" + key2+  ", score:" + advertiseVpns[index]);
					arr.push({user:key2, body: advertiseVpns[index]});
	         
				} );
		
				callback(arr);
				//var advertiseVpns = advertiseVpns_.map(( [slogan, vpnIds])=> [(Buffer.from(slogan.buffer)).toString(), vpnIds, count, pledge]	);
				//callback(advertiseVpns);

			}).catch((error) => {
				console.log(error)
				callback("");
			})
		});
	}



	async getVpninfo( vpnId ) {
		const api = await this.getApi();
		
		const vpn = await api.query.web3VpnNft.vpns(vpnId);
		const vpnPrice = await api.query.web3VpnNft.vpnPrices(vpnId);
		const vpnUsedCount = await api.query.web3VpnNft.vpnUsedCount(vpnId);	
		var vpnJson = {id: vpnId, exid: (Buffer.from(vpn[0].buffer)).toString() , title: (Buffer.from(vpn[1].buffer)).toString(), maxUser: vpn[2], pledge: vpn[3] , price:vpnPrice, vpnUsedCount:vpnUsedCount  };	
		return {vpn: vpnJson, price: vpnPrice, usedCount: vpnUsedCount};

	}

	async getVpninfoMulti( vpnIds ) {
		const api = await this.getApi();

		var advertiseVpns = [];
				
		const vpnList = await api.query.web3VpnNft.vpns.multi(vpnIds);
		const vpnPriceList = await api.query.web3VpnNft.vpnPrices.multi(vpnIds);
		const vpnUsedCountList = await api.query.web3VpnNft.vpnUsedCount.multi(vpnIds);	
		for(var i in vpnIds){
			var vpnId = vpnIds[i];
			var vpn = vpnList[i];
			var vpnPrice = vpnPriceList[i];
			var vpnUsedCount = vpnUsedCountList[i];
			var vpnJson  = {id: vpnId, exid: (Buffer.from(vpn[0].buffer)).toString() , title: (Buffer.from(vpn[1].buffer)).toString(), maxUser: vpn[2], pledge: vpn[3] , price:vpnPrice, vpnUsedCount:vpnUsedCount  };	
			advertiseVpns.push(vpnJson);
		}
		
		return advertiseVpns;

	}

	async useVpn(PHRASE, vpnid, tokenmd5, money) {
		const api = await this.getApi();

		const keyring = new Keyring({ type: 'sr25519' });
		const user = keyring.addFromUri(PHRASE);
		console.log(`Sending from address ${user.address} with publicKey [${user.publicKey}]`);

		const txHash = await api.tx.web3VpnNft
          	.useVpn(vpnid, tokenmd5, money)
          	.signAndSend(user);

		    // Show the hash
    		console.log(`Submitted with hash ${txHash}`);


		return txHash;
	}




	

	/***
	 * Transfer
	 * @param from from
	 * @param to to
	 * @param amount amount
	 * @return hash
	 */
	async transfer(from, to, amount) {

		//////////////////////////// alexander  ////////////////////////////
		const api = await this.getApi();

		// finds an injector for an address
		const injector = await web3FromAddress(from);

		// sets the signer for the address on the @polkadot/api
		api.setSigner(injector.signer);

		// sign and send out transaction - notice here that the address of the account (as retrieved injected)
		// is passed through as the param to the `signAndSend`, the API then calls the extension to present
		// to the user and get it signed. Once completex, the api sends the tx + signature via the normal process
		const h = api.tx.balances
			.transfer(to, amount)
			.signAndSend(from);

		return h;
	}

	/***
	 * Remark
	 * @param from from
	 * @param content content
	 * @return hash
	 */
	async remark(from, content) {

		//////////////////////////// alexander  ////////////////////////////
		const api = await this.getApi();

		// finds an injector for an address
		const injector = await web3FromAddress(from);

		// sets the signer for the address on the @polkadot/api
		api.setSigner(injector.signer);

		// sign and send out transaction - notice here that the address of the account (as retrieved injected)
		// is passed through as the param to the `signAndSend`, the API then calls the extension to present
		// to the user and get it signed. Once completex, the api sends the tx + signature via the normal process
		const h = api.tx.system
			.remark(content)
			.signAndSend(from);

		return h;
	}
}

window.PolkadotWeb3Url = 'ws://210.14.145.201:9944';
window.PolkadotWeb3JSSample = new PolkadotWeb3JSSample();

