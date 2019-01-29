
const gameCalc = require('gameCalc');

module.exports = ()=>{
	Game.scheduler.add('gameCalc', ()=> {
		gameCalc();
	});

};