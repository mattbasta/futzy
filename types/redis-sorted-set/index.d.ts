declare module "redis-sorted-set" {
    export default class RedisSortedSet<Key> {
        constructor();
        add(key: Key, value: number): void;
        range(start: number, end: number): Array<Key>;
    }
}
