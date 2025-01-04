import { Card } from "./Card";


export default function DisplayContent({ contents }: { contents: any[] }) {
    return (
        contents.map((content) =>
            <Card
                key={content._id}
                index={content._id}
                type={content.type}
                title={content.title}
                link={content.link}
            />
        )
    )
}
