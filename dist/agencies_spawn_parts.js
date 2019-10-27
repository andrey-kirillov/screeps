const costCalc = (parts)=>{
	return parts.reduce((aggr, part)=>(aggr + BODYPART_COST[part]), 0);
};
const timeCalc = (parts)=>{
	return parts.length * CREEP_SPAWN_TIME;
};

module.exports = {
	costCalc,
	timeCalc
};