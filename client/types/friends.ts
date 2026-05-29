export type FriendProfile = {
  id: string;
  relationId: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar: string | null;
  profileCode: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type FriendsResponse = {
  message: string;
  friends: FriendProfile[];
  count: number;
  profileCode: string;
};

export type FriendSearchResponse = {
  message: string;
  results: FriendProfile[];
};

export type AddFriendResponse = {
  message: string;
  friend: FriendProfile;
};
