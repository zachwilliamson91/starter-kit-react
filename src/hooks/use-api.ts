import { useState, useEffect } from 'react';

export type UseApiHookData<T extends any[]> = {
    data: T
    map: { [K in string | number]: T[0] }
    isLoading: boolean
    isLoaded: boolean
    hasError: boolean
}

export type UseApiHookDataScalar<T> = {
    data: T
    map: { [K in string | number]: T }
    isLoading: boolean
    isLoaded: boolean
    hasError: boolean
}

export type UseApiHookResponse<T extends any[], K extends any[]> = [
    UseApiHookData<T>, // hook data
    (data: T) => void, // set data
    (...args: K) => void, // api caller
];

export type UseApiHookResponseScalar<T, K extends any[]> = [
    UseApiHookDataScalar<T>, // hook data
    (data: T) => void, // set data
    (...args: K) => void, // api caller
];

export type UseApiHookConfig<T, K extends any[]> = {
    args?: K,
    when?: boolean[], 
    key?: string,
    onError?: (e: any) => void,
    onSuccess?: (response: T) => void
}

export type UseApiHook = <T extends any[], K extends any[]>(
    getPromise: (...args: K) => Promise<T>, 
    useApiConfig?: UseApiHookConfig<T, K>
) => UseApiHookResponse<T, K>;

export type UseApiScalarHook = <T, K extends any[]>(
    getPromise: (...args: K) => Promise<T>, 
    useApiConfig?: UseApiHookConfig<T, K>
) => UseApiHookResponseScalar<T, K>;

const _useApi = (getPromise: any, useApiConfig: any) => {
    const [ didHandleInitialRequest, setDidHandleInitialRequest ] = useState(false);
    const [ isLoading, setIsLoading ] = useState(true);
    const [ isLoaded, setIsLoaded ] = useState(false);
    const [ hasError, setHasError ] = useState(false);
    const [ data, setData ] = useState<any>();
    const [ dataMap, setDataMap ] = useState<any>({});

    const makeMapFromData = (data: any) => {
        const result: any = {};

        if (!data) 
            return result;

        const dataAsArray = Array.isArray(data) ? data : [data];

        const keyName = useApiConfig?.key || 'id';

        dataAsArray.forEach(d => {
            const key = d[keyName];
            result[key] = d;
        });

        return result;
    }

    const handlePromise = (promise: Promise<any>) => 
        promise
            .then((response) => {
                setData(response);
                const dataMap = makeMapFromData(response);
                setDataMap(dataMap);
                setIsLoading(false);
                setIsLoaded(true);

                if (useApiConfig?.onSuccess) {
                    useApiConfig.onSuccess(response);
                }
            })
            .catch((e) => {
                setIsLoading(false);
                setHasError(true);

                if (useApiConfig?.onError) {
                    useApiConfig.onError(e);
                }

                throw e;
            });

    useEffect(() => {
        if (didHandleInitialRequest)
            return;

        const areWinConditionsSatisfied = useApiConfig?.when == undefined || useApiConfig?.when.every((d: any) => d);

        if (areWinConditionsSatisfied) {
            setDidHandleInitialRequest(true);

            const promise = useApiConfig?.args != undefined
                ? getPromise(...useApiConfig?.args)
                : (getPromise as any)();

            handlePromise(promise);
        }
    });

    const useApiHookData = { 
        data,
        map: dataMap,
        isLoading,
        isLoaded,
        hasError
    };

    const exposedSetData = (t: any) => {
        setData(t);
        const dataMap = makeMapFromData(t);
        setDataMap(dataMap);
    };

    function refetch() {
        setHasError(false);
        setIsLoading(true);
        setIsLoaded(false);
        const promise = ((getPromise as any).apply(null, arguments) as Promise<any>);
        handlePromise(promise);
    }

    return [ useApiHookData, exposedSetData, refetch ];
}

export const useApi: UseApiHook = _useApi as any;
export const useApiScalar: UseApiScalarHook = _useApi as any;