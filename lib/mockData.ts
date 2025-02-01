import { faker } from '@faker-js/faker';

export interface MockPost {
  id: string;
  content: string;
  timestamp: number;
  address: string;
  imageUrl?: string;
  author: string;
  likes: number;
  comments: number;
}

export interface MockUser {
  address: string;
  username: string;
  avatar: string;
  posts: number;
  followers: number;
  following: number;
}

export const generateMockPosts = (count: number): MockPost[] => {
  return Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    content: faker.lorem.paragraph(),
    timestamp: faker.date.recent().getTime(),
    address: faker.string.hexadecimal({ length: 40, prefix: '0x' }),
    imageUrl: Math.random() > 0.5 ? faker.image.url() : undefined,
    author: faker.internet.userName(),
    likes: faker.number.int({ min: 0, max: 100 }),
    comments: faker.number.int({ min: 0, max: 50 })
  }));
};

export const generateMockUser = (address: string): MockUser => {
  return {
    address,
    username: faker.internet.userName(),
    avatar: faker.image.avatar(),
    posts: faker.number.int({ min: 1, max: 500 }),
    followers: faker.number.int({ min: 0, max: 1000 }),
    following: faker.number.int({ min: 0, max: 1000 })
  };
};