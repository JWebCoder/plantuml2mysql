export default `
CREATE TABLE IF NOT EXISTS NoPrimaryKeyTable (
\`parameter\` INT,
\`field\` ENUM('entry1')
)  ENGINE=INNODB;
`
