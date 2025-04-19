export class Query {
  content: string;
  language: string;
  timestamp: Date;
  file: File | null;
  type = 'Query';

  constructor(
    content: string = '',
    language: string = '',
    timestamp: Date = new Date(),
    file: File | null = null
  ) {
    this.content = content;
    this.language = language;
    this.timestamp = timestamp;
    this.file = file;
  }
}

export class Answer {
  content: string;
  timestamp: Date;
  file: File | null;
  type = 'Answer';

  constructor(
    content: string,
    timestamp,
    file: File | null = null
  ) {
    this.content = content;
    this.timestamp = timestamp;
    this.file = file;
  }
}

export class MessageContent {
  messageContent: Query | Answer;

  constructor(messageContent: Query | Answer) {
    this.messageContent = messageContent;
  }
}

export class MessageHistory {
  messages: MessageContent[];

  constructor(messages: MessageContent[]) {
    this.messages = messages;
  }
}

export class Models {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}
