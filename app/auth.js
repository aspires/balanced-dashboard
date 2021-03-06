Balanced.Auth = (function () {
	var auth = Ember.Object.extend(Ember.Evented).create();

	auth._doSignIn = function(opts) {
		var self = this;
		if (null == opts) {
			opts = {};
		}

		return Balanced.NET.ajax($.extend(true, {
			url: ENV.BALANCED.AUTH + '/logins',
			type: 'POST'
		}, opts)).done(function (response, status, jqxhr) {
			var user = Balanced.User.create();
			user.set('isNew', false);
			user._updateFromJson(response.user);
			user.set('isLoaded', true);
			user.trigger('didLoad');

			self.setAuthProperties(true,
				user,
				response.user_id,
				response.user_id,
				false);

			auth.rememberLogin(response.uri);

			self.trigger('signInSuccess');
		}).fail(function () {
			self.trigger('signInError');
		}).always(function () {
			self.trigger('signInComplete');
		});
	};

	auth.signIn = function(emailAddress, password) {
		return this._doSignIn({
			data: {
				email_address: emailAddress,
				password: password
			}
		});
	};

	auth.rememberMeSignIn = function() {
		var authCookie = this.retrieveLogin();
		if (authCookie) {
			return this._doSignIn({
				data: { uri: authCookie }
			});
		} else {
			var existingApiKey = this.getGuestAPIKey();
			if(existingApiKey) {
				return this.rememberGuestUser(existingApiKey);
			}
		}
	};

	auth.rememberGuestUser = function(apiKey) {
		this.setAPIKey(apiKey);
		return Balanced.NET.ajax({
			url: ENV.BALANCED.AUTH + '/v1/api_keys',
			type: 'GET'
		}).then(function(response) {
			var theKeys = _.filter(response.items, function (key) {
				if (key.secret !== null) {
					return key;
				}
			});
			var secret = theKeys.length ? theKeys[0].secret : null;

			auth.loginGuestUser(secret);
		}).then(function() {
			return Balanced.NET.ajax({
				url: ENV.BALANCED.API + '/v1/marketplaces',
				type: 'GET'
			}).then(function(response) {
				var marketplace = Balanced.Marketplace.create({
					uri: '/v1/marketplaces'
				});

				if (!response.items.length) {
					return;
				}

				marketplace.set('isNew', false);
				marketplace._updateFromJson(response.items[0]);
				marketplace.set('isLoaded', true);
				marketplace.trigger('didLoad');

				auth.setupGuestUserMarketplace(marketplace);

				return marketplace;
			});
		});
	};

	auth.loginGuestUser = function(apiKey) {
		auth.storeGuestAPIKey(apiKey);
		auth.setAPIKey(apiKey);

		var guestUser = Balanced.User.create({
			user_marketplaces: Ember.A()
		});
		auth.setAuthProperties(true, guestUser, '/users/guest', apiKey, true);
	};

	auth.setupGuestUserMarketplace = function(marketplace) {
		Balanced.Utils.setCurrentMarketplace(marketplace);

		var guestMarketplace = Balanced.UserMarketplace.create({
			id: marketplace.get('id'),
			uri: marketplace.get('uri'),
			name: marketplace.get('name'),
			secret: auth.getGuestAPIKey()
		});
		Balanced.Auth.get('user').get('user_marketplaces').pushObject(guestMarketplace);
	};

	auth.signOut = function() {
		var self = this;

		this.forgetLogin();
		return Balanced.NET.ajax({
			url: ENV.BALANCED.AUTH + '/logins/current',
			type: 'DELETE'
		}).done(function () {
			self.trigger('signOutSuccess');
		}).fail(function () {
			self.trigger('signOutError');
		}).always(function () {
			self.trigger('signOutComplete');
		});
	};

	auth.createNewGuestUser = function() {
		return Balanced.APIKey.create({
			uri: '/v1/api_keys'
		}).save().then(function (apiKey) {
			var secret = apiKey.get('secret');
			auth.loginGuestUser(secret);
		});
	};

	auth.setAuthProperties = function (signedIn, user, userId, authToken, isGuest) {
		auth.set('authToken', authToken);
		auth.set('userId', userId);
		auth.set('signedIn', signedIn);
		auth.set('user', user);
		auth.set('isGuest', isGuest);
	};

	auth.rememberLogin = function (token) {
		$.cookie(Balanced.COOKIE.EMBER_AUTH_TOKEN, token, {
			expires: 1,
			path: '/'
		});
	};

	auth.forgetLogin = function () {
		// Removing from the root domain since we were setting it on the root
		// domain for a while. This line can be removed after Aug 23, 2013
		$.removeCookie(Balanced.COOKIE.EMBER_AUTH_TOKEN, {
			path: '/',
			domain: 'balancedpayments.com'
		});

		$.removeCookie(Balanced.COOKIE.EMBER_AUTH_TOKEN, {
			path: '/'
		});

		$.removeCookie(Balanced.COOKIE.API_KEY_SECRET, {
			path: '/'
		});
		$.removeCookie(Balanced.COOKIE.API_KEY_SECRET, {
			path: '/',
			domain: 'balancedpayments.com'
		});

		$.removeCookie(Balanced.COOKIE.SESSION, {
			path: '/'
		});

		Balanced.NET.loadCSRFToken();

		auth.unsetAPIKey();

		auth.setAuthProperties(false, null, null, null, false);
	};

	auth.retrieveLogin = function () {
		return $.cookie(Balanced.COOKIE.EMBER_AUTH_TOKEN);
	};

	auth.setAPIKey = function(apiKeySecret) {
		Balanced.NET.defaultApiKey = apiKeySecret;
	};

	auth.unsetAPIKey = function() {
		Balanced.NET.defaultApiKey = null;
	};

	auth.storeGuestAPIKey = function (apiKeySecret) {
		$.cookie(Balanced.COOKIE.API_KEY_SECRET, apiKeySecret, {
			path: '/'
		});
	};

	auth.getGuestAPIKey = function() {
		return $.cookie(Balanced.COOKIE.API_KEY_SECRET);
	};

	return auth;
}());
