import os
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Union

from openai import AsyncOpenAI

Message = Union[str, List[Dict]]


class Chatbot:
    """
    A class representing a chatbot.

    Args:
        config (dict): Configuration settings for the chatbot.
        logger: Logger object for logging messages.

    Public Methods:
        stream: Streams the chatbot's response based on the query and other parameters.
    """

    def __init__(self, config, logger):
        os.environ["TOKENIZERS_PARALLELISM"] = "false"
        self.logger = logger
        self.config = config
        self.llms_config = self.config.get("llms", [])
        self.system_template = self.config.get("system_template", "")
        self.translate_system_template = self.config.get(
            "translate_system_template", ""
        )

        # This mapping is used to convert language codes to their full names.
        self.language_mapping = {
            "en": "English",
            "fr": "French",
            "de": "German",
            "es": "Spanish",
            "cn": "Chinese",
            "jp": "Japanese",
        }

    def _merge_messages(self, msg1: Message, msg2: Message) -> List[Dict]:
        def _normalize(msg: Message) -> List[Dict]:
            if isinstance(msg, str):
                return [{"type": "text", "text": msg}]
            return msg
        
        msg1_list = _normalize(msg1)
        msg2_list = _normalize(msg2)

        all_texts = [
            item["text"]
            for item in msg1_list + msg2_list
            if item["type"] == "text"
        ]
        merged_text = " ".join(all_texts).strip()

        all_images = [
            item for item in msg1_list + msg2_list if item["type"] == "image_url"
        ]
        
        result = []
        if merged_text:
            result.append({"type": "text", "text": merged_text})
        result.extend(all_images)

        return result

    def _fix_conversation(self, messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """
        Fixes the conversation format to ensure proper structure.
        This method ensures that the first message is from the user and that
        consecutive messages from the same role are merged into one.
        This is important for Mistral compatibility.

        Args:
            messages (list): List of messages in the conversation.
        Returns:
            list: Fixed list of messages.
        """
        fixed = []

        # Handle optional system
        if messages and messages[0]["role"] == "system":
            fixed.append(messages[0])
            messages = messages[1:]

        # Ensure first is user for Mistral compatibility
        if not messages or messages[0]["role"] != "user":
            fixed.append({"role": "user", "content": "Hello!"})
            last_role = "user"
        else:
            fixed.append(messages[0])
            last_role = messages[0]["role"]

        for msg in messages[1:]:
            if msg["role"] == last_role:
                # Merge content into the last message to avoid two consecutive messages of the same role
                fixed[-1]["content"] = self._merge_messages(fixed[-1]["content"], msg["content"])
            else:
                fixed.append(msg)
                last_role = msg["role"]

        return fixed

    async def stream(self, model: str, input_messages: List[Dict[str, str]], language: str):
        """
        Streams the chatbot's response based on the query and other parameters.

        Args:
            model (str): The model to use for the chatbot.
            input_messages (list): List of messages to send to the chatbot.
            language (str): The language to use.

        Yields:
            dict: The chatbot's response data.
        """
        
        selected_config = next( # Get the selected model configuration
            (item for item in self.llms_config if item["name"] == model), None
        )
        if selected_config:
            llm = AsyncOpenAI( # Initialize the LLM
                api_key=selected_config.get("api_key"),
                base_url=selected_config.get("inference_endpoint"),
            )
        else:
            return

     
        # Translate a string to English
        async def _translate_to_english(text_to_translate: str):
            translate_messages = []
            content = self.translate_system_template
            if content != "":
                translate_messages.append({"role": "system", "content": content})
            translate_messages.append({"role": "user", "content": text_to_translate})

            english_query = await llm.chat.completions.create(
                messages=translate_messages,
                model=selected_config.get("model_name"),
                max_completion_tokens=selected_config.get("max_tokens"),
                temperature=selected_config.get("temperature"),
                top_p=selected_config.get("top_p"),
                presence_penalty=selected_config.get("presence_penalty"),
                frequency_penalty=selected_config.get("frequency_penalty"),
            )

            english_query = ( # Some cleanup of the response
                str(english_query.choices[0].message.content)
                .replace("English:", "")
                .replace("Answer:", "")
                .replace("English translation:", "")
                .replace("Translation:", "")
                .strip()
                .lstrip("\t")
            )
            return english_query


        if language != "en":
            # Translate the last message (query) to English
            input_messages[-1]["content"] = await _translate_to_english(input_messages[-1]["content"])

        messages = []

        # Add system message if it exists
        system_content = self.system_template.format(
            language=self.language_mapping.get(language, "English")
        )
        if system_content != "":
            messages.append({"role": "system", "content": system_content})
        
        # Add the messages to the conversation
        for msg in input_messages:
            # If the model does not support vision and the message is not a string, clean it up
            if not selected_config.get("supports_vision") and not isinstance(msg["content"], str):
                new_content = [] 
                for item in msg["content"]:
                    for key, value in item.items():
                        if key == "text":
                            new_content.append({"type": "text", "text": value})
                messages.append({"role": msg["role"], "content": new_content})    
            else:
                messages.append(msg)

        messages = self._fix_conversation(messages)

        #self.logger.info(f'Messages: {messages}')

        # Create a function to call
        resp = await llm.chat.completions.create(
            messages=messages,
            model=selected_config.get("model_name"),
            max_completion_tokens=selected_config.get("max_tokens"),
            temperature=selected_config.get("temperature"),
            top_p=selected_config.get("top_p"),
            presence_penalty=selected_config.get("presence_penalty"),
            frequency_penalty=selected_config.get("frequency_penalty"),
            stream=True,
        )

        async for chunk in resp:
            if chunk.choices == []:  # Last chunk
                yield None
                break
            if chunk.choices[0].delta.content:
                delta = chunk.choices[0].delta.content
                yield delta
