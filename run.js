const creepFetcher = require('fetcher');
const creepMiner = require('miner');
const creepCarryTransition = require('carryTransition');
const creepRetiree = require('retiree');
const creepUber = require('uberDriver');
const creepDeliver = require('deliver');
const creepBuilder = require('builder');

const gameCalc = require('gameCalc');

module.exports = ()=>{
	Game.scheduler.add('gameCalc', ()=> {
		gameCalc();
	});

};