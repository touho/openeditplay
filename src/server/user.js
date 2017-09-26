let user = module.exports;

user.getProfile = function(userId, userToken) {
	return {
		exists: false,
		games: 666,
		userId,
		userToken
	};
};
