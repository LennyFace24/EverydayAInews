export default function Card({ title,description}:{title:string,description:string}){
    return (
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-bold mb-4">{title}</h3>
            <p className="text-gray-700 leading-relaxed">{description}</p>
        </div>
    )
}