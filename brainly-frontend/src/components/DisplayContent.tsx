import { Card } from "./Card";
import type { Content } from "../types";

interface DisplayContentProps {
  contents: Content[];
  onChanged?: () => Promise<void> | void;
  readOnly?: boolean;
}

export default function DisplayContent({ contents, onChanged, readOnly }: DisplayContentProps) {
  return (
    <>
      {contents.map((content) => (
        <Card
          key={content._id}
          index={content._id}
          type={content.type}
          title={content.title}
          link={content.link}
          readOnly={readOnly}
          onChanged={onChanged}
        />
      ))}
    </>
  );
}
