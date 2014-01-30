Geotables = new Meteor.Collection('geotables');

Geotables.allow({
  insert: function (userId, geotable) {
    if (checkOwnerRight(userId, geotable) || !checkJSON(geotable.json))
      return false; // not the owner
  	return true;

  },
  update: function (userId, geotable, fields, modifier) {
    if (checkOwnerRight(userId, geotable) || (!checkAdminEmail() && userId !== modifier['$set']['owner']) || !checkJSON(modifier['$set']['json']))
      return false; // not the owner
    return true;
  },
  remove: function (userId, geotable) {
    // You can only remove parties that you created and nobody is going to.
    return geotable.owner === userId || checkAdminEmail();
  }
});

function checkOwnerRight(userId, geotable) {
  return !(userId == geotable.owner || checkAdminEmail())
}

function checkJSON(json) {
	try {
		var probablyArray = JSON.parse(json);
	} catch (e) {
		throw new Meteor.Error('500', 'json некорректен');
	}
	return (Object.prototype.toString.call(probablyArray) === '[object Array]');
};

checkAdminEmail = function(){  // without var - GLOBAL
    return Meteor.user() && Meteor.user().emails[0].address === "kulikovpavel@gmail.com"
  };
