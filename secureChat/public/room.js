function room(id, name, userid) {
	this.id = id;
	this.name = name;
	this.admin = userid;
	this.users += userid;
}
