
import { Vector4vl, Mem4vl, Display4vl } from '../src/index';
import * as _ from 'lodash';
import * as jsc from 'jsverify';

const replicate = (n, g) => jsc.tuple(Array(n).fill(g))

const myarray = <A>(arb : jsc.ArbitraryLike<A>) => jsc.bless({
    generator: jsc.generator.bless((size : number) =>
        jsc.generator.tuple(Array(jsc.random(0, size)).fill(arb.generator))(size)),
    shrink: jsc.shrink.array(arb.shrink),
    show: a => jsc.show.array(arb.show, a)
});

const myarrays = <A>(n : number, arb : jsc.ArbitraryLike<A>) => jsc.bless({
    generator: jsc.generator.bless((size : number) =>
        jsc.generator.tuple(Array(n).fill(jsc.generator.tuple(Array(jsc.random(0, size)).fill(arb.generator))))(size)),
    shrink: jsc.shrink.tuple(Array(n).fill(jsc.shrink.array(arb.shrink))), // TODO breaks same size invariant
    show: a => jsc.show.tuple(Array(n).fill(b => jsc.show.array(arb.show, b)), a)
});

const myrandarrays = <A>(arb : jsc.ArbitraryLike<A>) => jsc.bless({
    generator: jsc.generator.bless((size : number) =>
        jsc.generator.array(jsc.generator.tuple(Array(jsc.random(0, size)).fill(arb.generator)))(size)),
    shrink: jsc.shrink.array(jsc.shrink.array(arb.shrink)), // TODO breaks same size invariant
    show: a => jsc.show.array(b => jsc.show.array(arb.show, b), a)
});

const bit = jsc.elements([-1, 1]);
const trit = jsc.elements([-1, 0, 1]);
const quad = jsc.elements([-1, 0, 1, 2]);
const barray4vl = myarray(bit);
const array4vl = myarray(quad);
const arrays4vl = n => myarrays(n, quad);
const bvector4vl = barray4vl.smap(a => Vector4vl.fromArray(a), v => v.toArray());
const vector4vl = array4vl.smap(a => Vector4vl.fromArray(a), v => v.toArray());
const vectors4vl = n => arrays4vl(n).smap(x => x.map(a => Vector4vl.fromArray(a)), x => x.map(v => v.toArray()));
// z-free generators: per IEEE 1800-2023 Tables 11-11..11-18, "z" never
// survives and/or/xor/not/xmask as a *result* (it always collapses to "x"),
// so identity/idempotence laws like `a|0==a` or `~~a==a` only hold when `a`
// itself has no "z" bits. Used just for those properties below.
const array4vlNoZ = myarray(trit);
const arrays4vlNoZ = n => myarrays(n, trit);
const vector4vlNoZ = array4vlNoZ.smap(a => Vector4vl.fromArray(a), v => v.toArray());
const vectors4vlNoZ = n => arrays4vlNoZ(n).smap(x => x.map(a => Vector4vl.fromArray(a)), x => x.map(v => v.toArray()));
const binarytxt = jsc.array(jsc.elements(['0', '1', 'x', 'z'])).smap(a => a.join(''), s => s.split(''))
const octaltxt = myarray(jsc.elements(['x', 'z'].concat(Array.from(Array(8), (a, i) => i.toString()))))
    .smap(a => a.join(''), s => s.split(''))
const decimaltxt = myarray(jsc.elements([].concat(Array.from(Array(10), (a, i) => i.toString()))))
    .smap(a => a.join(''), s => s.split(''))
const hextxt = myarray(jsc.elements(['x', 'z'].concat(Array.from(Array(16), (a, i) => i.toString(16)))))
    .smap(a => a.join(''), s => s.split(''))
const randarrays4vl = myrandarrays(quad);
const randvectors4vl = randarrays4vl.smap(x => x.map(a => Vector4vl.fromArray(a)), x => x.map(v => v.toArray()));
const mem4vl = randvectors4vl.smap(a => Mem4vl.fromData(a), m => m.toArray());

describe('relation to arrays', () => {
    jsc.property('fromArray.toArray', array4vl, a =>
        _.isEqual(a, Vector4vl.fromArray(a).toArray()));

    jsc.property('toArray.fromArray', vector4vl, v =>
        v.eq(Vector4vl.fromArray(v.toArray())));

    jsc.property('get', vector4vl, v =>
        _.isEqual(v.toArray(), Array.from(Array(v.bits), (x, k) => v.get(k))));
});

describe('fromString', () => {
    jsc.property('binary', binarytxt, s =>
        s === Vector4vl.fromString('b' + s).toBin());

    jsc.property('octal', octaltxt, s =>
        s === Vector4vl.fromString('o' + s).toOct());

    jsc.property('hexadecimal', hextxt, s =>
        s === Vector4vl.fromString('h' + s).toHex());

    jsc.property('decimal', decimaltxt, s =>
        BigInt(s) === Vector4vl.fromString('d' + s).toBigInt());

    jsc.property('binary sized bits', binarytxt, jsc.nat(100), (s, n) =>
        n === Vector4vl.fromString(n + 'b' + s).bits);

    jsc.property('octal sized bits', octaltxt, jsc.nat(100), (s, n) =>
        n === Vector4vl.fromString(n + 'o' + s).bits);

    jsc.property('hexadecimal sized bits', hextxt, jsc.nat(100), (s, n) =>
        n === Vector4vl.fromString(n + 'h' + s).bits);

    jsc.property('decimal sized bits', decimaltxt, jsc.nat(100), (s, n) =>
        n === Vector4vl.fromString(n + 'd' + s).bits);

});

describe('parsing and printing', () => {
    jsc.property('rev binary', vector4vl, v =>
        v.eq(Vector4vl.fromBin(v.toBin())));

    jsc.property('binary', binarytxt, s =>
        s === Vector4vl.fromBin(s).toBin());

    jsc.property('octal', octaltxt, s =>
        s === Vector4vl.fromOct(s).toOct());

    jsc.property('hexadecimal', hextxt, s =>
        s === Vector4vl.fromHex(s).toHex());

    jsc.property('binary bits', binarytxt, s =>
        s.length === Vector4vl.fromBin(s).bits);

    jsc.property('octal bits', octaltxt, s =>
        3 * s.length === Vector4vl.fromOct(s).bits);

    jsc.property('hexadecimal bits', hextxt, s =>
        4 * s.length === Vector4vl.fromHex(s).bits);

    jsc.property('rev number', bvector4vl, v =>
        v.eq(Vector4vl.fromNumber(v.toBigInt(), v.bits)));

    jsc.property('rev number bits', bvector4vl, v =>
        Math.max(1, v.bits) >= Vector4vl.fromNumber(v.toBigInt()).bits);

    jsc.property('rev number val', bvector4vl, v =>
        v.toBigInt() == Vector4vl.fromNumber(v.toBigInt()).toBigInt());

    jsc.property('number', jsc.nat, n =>
        n == Vector4vl.fromNumber(n).toNumber());

    jsc.property('rev signed number', bvector4vl, v => v.bits == 0 ||
        v.eq(Vector4vl.fromNumber(v.toBigIntSigned(), v.bits)));

    jsc.property('negative number', jsc.nat, n =>
        -n == Vector4vl.fromNumber(-n).toNumberSigned());

    const ex = s => s == '' ? '0' : (s[0] == 'x' || s[0] == 'z') ? s[0] : '0';

    jsc.property('binary sized', binarytxt, jsc.nat(100), (s, n) =>
        ex(s).repeat(n).concat(s).slice(-n).slice(0, n) === Vector4vl.fromBin(s, n).toBin());

    jsc.property('octal sized', octaltxt, jsc.nat(100), (s, n) =>
        ex(s).repeat(n).concat(s).slice(-n).slice(0, n) === Vector4vl.fromOct(s, 3*n).toOct());

    jsc.property('hexadecimal sized', hextxt, jsc.nat(100), (s, n) =>
        ex(s).repeat(n).concat(s).slice(-n).slice(0, n) === Vector4vl.fromHex(s, 4*n).toHex());

    jsc.property('binary sized bits', binarytxt, jsc.nat(100), (s, n) =>
        n === Vector4vl.fromBin(s, n).bits);

    jsc.property('octal sized bits', octaltxt, jsc.nat(100), (s, n) =>
        n === Vector4vl.fromOct(s, n).bits);

    jsc.property('hexadecimal sized bits', hextxt, jsc.nat(100), (s, n) =>
        n === Vector4vl.fromHex(s, n).bits);

    jsc.property('number sized bits', jsc.nat, jsc.nat(100), (v, n) =>
        n === Vector4vl.fromNumber(v, n).bits);

});

describe('constant vectors', () => {
    jsc.property('0', jsc.nat(1000), n =>
        _.isEqual(Array(n).fill(-1), Vector4vl.zeros(n).toArray()));
    jsc.property('x', jsc.nat(1000), n =>
        _.isEqual(Array(n).fill(0), Vector4vl.xes(n).toArray()));
    jsc.property('1', jsc.nat(1000), n =>
        _.isEqual(Array(n).fill(1), Vector4vl.ones(n).toArray()));
    jsc.property('z', jsc.nat(1000), n =>
        _.isEqual(Array(n).fill(2), Vector4vl.zes(n).toArray()));
});

describe('predicates', () => {
    jsc.property('isLow', vector4vl, v =>
        v.isLow == v.toArray().every(x => x == -1));

    jsc.property('isHigh', vector4vl, v =>
        v.isHigh == v.toArray().every(x => x == 1));

    jsc.property('isDefined', vector4vl, v =>
        v.isDefined == v.toArray().some(x => x != 0 && x != 2));

    jsc.property('isFullyDefined', vector4vl, v =>
        v.isFullyDefined == v.toArray().every(x => x != 0 && x != 2));
});

describe('not properties', () => {
    jsc.property('~~a == a', vector4vlNoZ, v =>
        v.eq(v.not().not()));

    jsc.property('~(a | b) == ~a & ~b', vectors4vl(2), ([v, w]) =>
        v.or(w).not().eq(v.not().and(w.not())));

    jsc.property('~(a & b) == ~a | ~b', vectors4vl(2), ([v, w]) =>
        v.and(w).not().eq(v.not().or(w.not())));

    jsc.property('~(a ^ b) == ~a ^ b', vectors4vl(2), ([v, w]) =>
        v.xor(w).not().eq(v.not().xor(w)));
});

describe('or properties', () => {
    jsc.property('a | a == a', vector4vlNoZ, v =>
        v.eq(v.or(v)));

    jsc.property('a | 0 == a', vector4vlNoZ, v =>
        v.eq(v.or(Vector4vl.zeros(v.bits))));

    jsc.property('0 | a == a', vector4vlNoZ, v =>
        Vector4vl.zeros(v.bits).or(v).eq(v));

    jsc.property('a | 1 == 1', vector4vl, v =>
        Vector4vl.ones(v.bits).eq(v.or(Vector4vl.ones(v.bits))));

    jsc.property('1 | a == 1', vector4vl, v =>
        Vector4vl.ones(v.bits).eq(Vector4vl.ones(v.bits).or(v)));

    jsc.property('a | b == b | a', vectors4vl(2), ([v, w]) =>
        v.or(w).eq(w.or(v)));

    jsc.property('(a | b) | c == a | (b | c)', vectors4vl(3), ([v, w, x]) =>
        v.or(w).or(x).eq(v.or(w.or(x))));
});

describe('and properties', () => {
    jsc.property('a & a == a', vector4vlNoZ, v =>
        v.eq(v.and(v)));

    jsc.property('a & 0 == 0', vector4vl, v =>
        Vector4vl.zeros(v.bits).eq(v.and(Vector4vl.zeros(v.bits))));

    jsc.property('0 & a == 0', vector4vl, v =>
        Vector4vl.zeros(v.bits).eq(Vector4vl.zeros(v.bits).and(v)));

    jsc.property('x & 1 == a', vector4vlNoZ, v =>
        v.eq(v.and(Vector4vl.ones(v.bits))));

    jsc.property('1 & a == a', vector4vlNoZ, v =>
        v.eq(Vector4vl.ones(v.bits).and(v)));

    jsc.property('a & b == b & a', vectors4vl(2), ([v, w]) =>
        v.and(w).eq(w.and(v)));

    jsc.property('(a & b) & c == a & (b & c)', vectors4vl(3), ([v, w, x]) =>
        v.and(w).and(x).eq(v.and(w.and(x))));
});

describe('xor properties', () => {
    jsc.property('a ^ 0 == a', vector4vlNoZ, v =>
        v.xor(Vector4vl.zeros(v.bits)).eq(v));

    jsc.property('0 ^ a == a', vector4vlNoZ, v =>
        Vector4vl.zeros(v.bits).xor(v).eq(v));

    jsc.property('a ^ 1 == ~a', vector4vl, v =>
        v.xor(Vector4vl.ones(v.bits)).eq(v.not()));

    jsc.property('1 ^ a == ~a', vector4vl, v =>
        Vector4vl.ones(v.bits).xor(v).eq(v.not()));

    jsc.property('a ^ b == b ^ a', vectors4vl(2), ([v, w]) =>
        v.xor(w).eq(w.xor(v)));

    jsc.property('(a ^ b) ^ c == a ^ (b ^ c)', vectors4vl(3), ([v, w, x]) =>
        v.xor(w).xor(x).eq(v.xor(w.xor(x))));
});

describe('negated ops', () => {
    jsc.property('a ~| b == ~(a | b)', vectors4vl(2), ([v, w]) =>
        v.nor(w).eq(v.or(w).not()));

    jsc.property('a ~& b == ~(a & b)', vectors4vl(2), ([v, w]) =>
        v.nand(w).eq(v.and(w).not()));

    jsc.property('a ~^ b == ~(a ^ b)', vectors4vl(2), ([v, w]) =>
        v.xnor(w).eq(v.xor(w).not()));
});

describe('reducing ops', () => {
    jsc.property('&a', vector4vl, v =>
        v.reduceAnd().eq(v.toArray().map(x => Vector4vl.make(1, x)).reduce((a, b) => a.and(b), Vector4vl.one)));

    jsc.property('|a', vector4vl, v =>
        v.reduceOr().eq(v.toArray().map(x => Vector4vl.make(1, x)).reduce((a, b) => a.or(b), Vector4vl.zero)));

    jsc.property('^a', vector4vl, v =>
        v.reduceXor().eq(v.toArray().map(x => Vector4vl.make(1, x)).reduce((a, b) => a.xor(b), Vector4vl.zero)));

    jsc.property('~&a', vector4vl, v =>
        v.reduceNand().eq(v.toArray().map(x => Vector4vl.make(1, x)).reduce((a, b) => a.and(b), Vector4vl.one).not()));

    jsc.property('~|a', vector4vl, v =>
        v.reduceNor().eq(v.toArray().map(x => Vector4vl.make(1, x)).reduce((a, b) => a.or(b), Vector4vl.zero).not()));

    jsc.property('~^a', vector4vl, v =>
        v.reduceXnor().eq(v.toArray().map(x => Vector4vl.make(1, x)).reduce((a, b) => a.xor(b), Vector4vl.zero).not()));
});

describe('concat', () => {
    jsc.property('(a ++ b) ++ c == a ++ (b ++ c)', replicate(3, vector4vl), ([v, w, x]) =>
        v.concat(w).concat(x).eq(v.concat(w.concat(x))));

    jsc.property('(a ++ b) ++ c == a ++ b ++ c', replicate(3, vector4vl), ([v, w, x]) =>
        v.concat(w).concat(x).eq(Vector4vl.concat(v, w, x)));

    jsc.property('a ++ null == a', vector4vl, v =>
        v.concat(Vector4vl.zeros(0)).eq(v));

    jsc.property('null ++ a == a', vector4vl, v =>
        Vector4vl.zeros(0).concat(v).eq(v));
});

describe('slice', () => {
    jsc.property('a.slice() == a', vector4vl, v =>
        v.slice().eq(v));

    jsc.property('a.slice(a.bits) == null', vector4vl, v =>
        v.slice(v.bits).eq(Vector4vl.zeros(0)));

    jsc.property('a.slice(0, 0) == null', vector4vl, v =>
        v.slice(0, 0).eq(Vector4vl.zeros(0)));

    jsc.property('a.slice(0, n) ++ a.slice(n) == a', vector4vl, jsc.nat(10), (v, n) =>
        v.slice(0, n).concat(v.slice(n)).eq(v));
});

describe('xmask', () => {
    jsc.property('a | a.xmask() fully defined', vector4vl, v =>
        v.xmask().or(v).isFullyDefined);
    jsc.property('a & ~a.xmask() fully defined', vector4vl, v =>
        v.xmask().not().and(v).isFullyDefined);
    jsc.property('a ^ a.xmask() == a', vector4vlNoZ, v =>
        v.xmask().xor(v).eq(v));
});

describe('memory json', () => {
    jsc.property('m.toJSON().fromJSON() == m', mem4vl, (m) => m.eq(Mem4vl.fromJSON(m.bits, m.toJSON())));
    jsc.property('m.toArray().fromData() == m', mem4vl, (m) => m.eq(Mem4vl.fromData(m.toArray())));
});

describe('z value semantics (IEEE 1800-2023 Tables 11-11..11-18)', () => {
    const Z = Vector4vl.z, X = Vector4vl.x, ONE = Vector4vl.one, ZERO = Vector4vl.zero;

    test('1 & z == x', () => expect(ONE.and(Z).eq(X)).toBe(true));
    test('0 & z == 0', () => expect(ZERO.and(Z).eq(ZERO)).toBe(true));
    test('x & z == x', () => expect(X.and(Z).eq(X)).toBe(true));
    test('z & z == x', () => expect(Z.and(Z).eq(X)).toBe(true));

    test('1 | z == 1', () => expect(ONE.or(Z).eq(ONE)).toBe(true));
    test('0 | z == x', () => expect(ZERO.or(Z).eq(X)).toBe(true));

    test('1 ^ z == x', () => expect(ONE.xor(Z).eq(X)).toBe(true));
    test('0 ^ z == x', () => expect(ZERO.xor(Z).eq(X)).toBe(true));

    test('~z == x', () => expect(Z.not().eq(X)).toBe(true));

    test('z !== x (case equality distinguishes)', () => expect(Z.eq(X)).toBe(false));

    test('toBin/toHex/toOct roundtrip z', () => {
        expect(Vector4vl.fromBin('z01x').toBin()).toBe('z01x');
        expect(Vector4vl.fromHex('z0f').toHex()).toBe('z0f');
        expect(Vector4vl.fromOct('z07').toOct()).toBe('z07');
    });

    test('mixed nibble shows x, not z', () => {
        // 4 bits: z,z,z,0 -- not uniformly z, so the hex digit must be 'x'
        expect(Vector4vl.fromBin('0zzz').toHex()).toBe('x');
    });

    test('extension pads with z when leading bit is z', () => {
        expect(Vector4vl.fromBin('z1', 4).toBin()).toBe('zzz1');
    });
});

describe('display4vl', () => {
    const disp = new Display4vl();

    jsc.property('binary', binarytxt, s =>
        s === disp.show('bin', Vector4vl.fromBin(s)) &&
        s === disp.read('bin', s).toBin());

    jsc.property('octal', octaltxt, s =>
        s === disp.show('oct', Vector4vl.fromOct(s)) &&
        s === disp.read('oct', s).toOct());

    jsc.property('hexadecimal', hextxt, s =>
        s === disp.show('hex', Vector4vl.fromHex(s)) &&
        s === disp.read('hex', s).toHex());

    jsc.property('decimal', decimaltxt, s =>
        BigInt(s).toString() === disp.show('dec', Vector4vl.fromNumber(BigInt(s))) &&
        BigInt(s) === disp.read('dec', s).toBigInt());

    jsc.property('binary sized', binarytxt, jsc.nat(100), (s, n) =>
        Vector4vl.fromBin(s, n).eq(disp.read('bin', s, n)));

    jsc.property('octal sized', octaltxt, jsc.nat(100), (s, n) =>
        Vector4vl.fromOct(s, n).eq(disp.read('oct', s, n)));

    jsc.property('hexadecimal sized', hextxt, jsc.nat(100), (s, n) =>
        Vector4vl.fromHex(s, n).eq(disp.read('hex', s, n)));

    test('usable displays', () => {
        expect(disp.usableDisplays('read', 1)).toEqual(['bin','dec','dec2c','hex','oct']);
        expect(disp.usableDisplays('show', 1)).toEqual(['bin','dec','dec2c','hex','oct']);
    });

    jsc.property('binary validate', binarytxt, s => disp.validate('bin', s));

    jsc.property('octal validate', octaltxt, s => disp.validate('oct', s));

    jsc.property('hexadecimal validate', hextxt, s => disp.validate('hex', s));

    jsc.property('decimal validate', decimaltxt, s => disp.validate('dec', s));

    jsc.property('signed decimal validate', decimaltxt, s => disp.validate('dec2c', s) && disp.validate('dec2c', "-" + s));

    jsc.property('binary size', binarytxt, s => disp.size('bin', Vector4vl.fromBin(s).bits) == s.length);

    jsc.property('octal size', octaltxt, s => disp.size('oct', Vector4vl.fromOct(s).bits) == s.length);

    jsc.property('hexadecimal size', hextxt, s => disp.size('hex', Vector4vl.fromHex(s).bits) == s.length);

    jsc.property('decimal size', decimaltxt, s => disp.size('dec', Vector4vl.fromNumber(BigInt(s)).bits) >= BigInt(s).toString().length);

    jsc.property('signed decimal size', decimaltxt, s => disp.size('dec2c', Vector4vl.fromNumber(-BigInt(s)).bits) >= (-BigInt(s)).toString().length);

    jsc.property('octal size fractional', binarytxt, s => disp.size('oct', Vector4vl.fromBin(s).bits) == Math.ceil(s.length / 3));

    jsc.property('hexadecimal size fractional', binarytxt, s => disp.size('hex', Vector4vl.fromBin(s).bits) == Math.ceil(s.length / 4));
});
