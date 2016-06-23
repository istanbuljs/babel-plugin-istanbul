function makeVisitor({types: t}) {
    return {
        visitor: {
            Program: {
                enter(path, state) {
                    console.error('NOOP for now');
                },
                exit(path, state) {
                    console.error('NOOP for now');
                }
            }
        }
    };
}

export default makeVisitor;
