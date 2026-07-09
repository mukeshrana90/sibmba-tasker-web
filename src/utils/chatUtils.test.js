import {
  extractChatMessageRows,
  getChatPeerId,
  getLastMessagePreview,
  isMessageForChat,
  normalizeChatMessages,
  normalizeChatUserId,
  chatPeerDisplayName,
} from "./chatUtils";

describe("chatUtils", () => {
  test("normalizeChatUserId handles strings and objects", () => {
    expect(normalizeChatUserId("abc")).toBe("abc");
    expect(normalizeChatUserId({ _id: "xyz" })).toBe("xyz");
    expect(normalizeChatUserId(null)).toBe("");
  });

  test("getChatPeerId returns receiver when current user is sender", () => {
    expect(
      getChatPeerId({ sender_id: "me", receiver_id: "them" }, "me")
    ).toBe("them");
  });

  test("getChatPeerId returns sender when current user is receiver", () => {
    expect(
      getChatPeerId({ sender_id: "them", receiver_id: "me" }, "me")
    ).toBe("them");
  });

  test("normalizeChatMessages unwraps nested API payloads", () => {
    const messages = normalizeChatMessages({
      data: [{ sender_id: { _id: "a" }, receiver_id: "b", message: "hi" }],
    });
    expect(messages[0].sender_id).toBe("a");
    expect(messages[0].receiver_id).toBe("b");
  });

  test("extractChatMessageRows handles paginated API payload", () => {
    expect(
      extractChatMessageRows({
        page: 1,
        data: [{ message: "hello" }],
      })
    ).toHaveLength(1);
  });

  test("isMessageForChat matches either direction", () => {
    expect(
      isMessageForChat(
        { sender_id: "peer", receiver_id: "me" },
        "me",
        "peer"
      )
    ).toBe(true);
    expect(
      isMessageForChat(
        { sender_id: "me", receiver_id: "peer" },
        "me",
        "peer"
      )
    ).toBe(true);
  });

  test("getLastMessagePreview handles image and text", () => {
    expect(getLastMessagePreview({ message_type: 1, message: "x" })).toBe(
      "Image"
    );
    expect(
      getLastMessagePreview({ message_type: 0, message: "Hello there friend" })
    ).toBe("Hello there friend");
    expect(
      getLastMessagePreview({
        message_type: 0,
        message: "This is a very long preview message",
      })
    ).toBe("This is a very long previ...");
  });

  test("chatPeerDisplayName prefers name then email local part", () => {
    expect(chatPeerDisplayName({ full_name: "Jane Doe" })).toBe("Jane Doe");
    expect(
      chatPeerDisplayName({ full_name: "undefined", email: "mrmagaisa@gmail.com" })
    ).toBe("Mrmagaisa");
    expect(chatPeerDisplayName({ email: "mrmagaisa@gmail.com" })).toBe(
      "Mrmagaisa"
    );
    expect(chatPeerDisplayName({ name: "undefined" })).toBe("User");
    expect(chatPeerDisplayName(null)).toBe("User");
  });
});
