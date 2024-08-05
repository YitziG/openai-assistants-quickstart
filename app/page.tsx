"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import Chat from "./components/chat";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import {
    getSefariaCategory
} from "./services/sefaria/category";
import {
    getAllDataForIndex
} from "./services/sefaria/index";
import {
    getTopic
} from "./services/sefaria/topics";
import {
    getTopicGraph
} from "./services/sefaria/topics-graph";
import {
    getLearningSchedule
} from "./services/sefaria/calendars";
import {
    getRecommendedTopics
} from "./services/sefaria/recommendedTopics";
import {
    getLexiconEntry
} from "./services/sefaria/words/word";
import {
    getTextShape
} from "./services/sefaria/shape";
import {
    searchSefaria
} from "./services/sefaria/search";
import {
    getSefariaText,
    getRelated,
    getCommentaryText
} from "./services/sefaria/text";

const Home = () => {
    const [data, setData] = useState<any>(null);

    const functionCallHandler = async (call: RequiredActionFunctionToolCall) => {
        if (!call?.function?.name) return;

        const args = JSON.parse(call.function.arguments);
        let result;

        switch (call.function.name) {
            case "getSefariaCategory":
                result = await getSefariaCategory(args.categoryPath);
                setData({ type: 'category', result });
                break;
            case "getAllDataForIndex":
                result = await getAllDataForIndex(args.indexTitle);
                setData({ type: 'index', result });
                break;
            case "getTopic":
                result = await getTopic(args);
                setData({ type: 'topic', result });
                break;
            case "getTopicGraph":
                result = await getTopicGraph(args);
                setData({ type: 'topicGraph', result });
                break;
            case "getLearningSchedule":
                result = await getLearningSchedule(args.diaspora);
                setData({ type: 'learningSchedule', result });
                break;
            case "getRecommendedTopics":
                result = await getRecommendedTopics(args.ref_list);
                setData({ type: 'recommendedTopics', result });
                break;
            case "getLexiconEntry":
                result = await getLexiconEntry(args);
                setData({ type: 'lexiconEntry', result });
                break;
            case "getTextShape":
                result = await getTextShape(args);
                setData({ type: 'textShape', result });
                break;
            case "searchSefaria":
                result = await searchSefaria(args);
                setData({ type: 'search', result });
                break;
            case "getSefariaText":
                result = await getSefariaText(args);
                setData({ type: 'sefariaText', result });
                break;
            case "getRelated":
                result = await getRelated(args);
                setData({ type: 'related', result });
                break;
            case "getCommentaryText":
                result = await getCommentaryText(args.commentRef);
                setData({ type: 'commentaryText', result });
                break;
            default:
                console.error("Unknown function call:", call.function.name);
                return;
        }

        return JSON.stringify(result);
    };

    return (
        <main className={styles.main}>
            <div className={styles.container}>
                <div className={styles.chatContainer}>
                    <div className={styles.chat}>
                        <Chat functionCallHandler={functionCallHandler} />
                    </div>
                </div>
            </div>
        </main>
    );
};

export default Home;
