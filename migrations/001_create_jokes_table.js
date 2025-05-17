exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("jokes", {
    id: "id",
    text: { type: "text", notNull: true },
    rating: { type: "integer", notNull: true, default: 0 },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("jokes");
};
