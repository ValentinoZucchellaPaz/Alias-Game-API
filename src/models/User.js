// TODO:
export class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
    /**
     * en db hay:
     * id, name, email (estos unique)
     * password, role (player | admin), isVerified, createdAt, deletedAt
     */
  }

  getInfo() {
    return `Name: ${this.name}, Email: ${this.email}`;
  }
}
